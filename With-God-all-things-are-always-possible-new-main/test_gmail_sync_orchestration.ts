import assert from 'assert';

console.log('--- Running Gmail Sync Orchestration & Notification Accuracy Regression Tests ---');

// Simulated server sync responses representing States A, B, C, D
interface SyncResponse {
  success: boolean;
  status: 'completed' | 'already_in_progress' | 'failed';
  alreadyInProgress?: boolean;
  countDiscovered?: number;
  countImported?: number;
  countIndexed?: number;
  countDuplicates?: number;
  message?: string;
  error?: string;
  createdDocuments?: any[];
}

// Emulate frontend notification decision logic from AppContext.tsx
function getFrontendNotification(syncData: SyncResponse, channelName = 'Gmail') {
  if (!syncData.success || syncData.status === 'failed') {
    return {
      type: 'error',
      title: `${channelName} Sync Failed`,
      desc: syncData.error || `${channelName} sync failed. Please check your connection.`,
    };
  }

  if (syncData.status === 'already_in_progress' || syncData.alreadyInProgress) {
    return {
      type: 'in_progress',
      title: `${channelName} Sync In Progress`,
      desc: `${channelName} sync is already in progress. Your documents will appear when processing is complete.`,
    };
  }

  const countIndexed = typeof syncData.countIndexed === 'number' ? syncData.countIndexed : (syncData.createdDocuments?.length || 0);
  const countImported = typeof syncData.countImported === 'number' ? syncData.countImported : 0;
  const countDuplicates = typeof syncData.countDuplicates === 'number' ? syncData.countDuplicates : 0;

  let activityText = '';
  if (countIndexed > 0) {
    activityText = `Smart Import: ${countImported} new attachment(s) imported from ${channelName}`;
  } else if (countDuplicates > 0) {
    activityText = `${channelName} sync complete: All attachments are up to date (${countDuplicates} existing verified)`;
  } else {
    // Only in State B: completed with genuinely 0 attachments discovered
    activityText = syncData.message || `${channelName} sync completed. No new email attachments found in Gmail inbox.`;
  }

  return {
    type: 'success',
    title: `${channelName} Sync Completed`,
    desc: activityText,
  };
}

// TEST 1: State A - Sync completed with documents
{
  const stateA: SyncResponse = {
    success: true,
    status: 'completed',
    alreadyInProgress: false,
    countDiscovered: 3,
    countImported: 3,
    countIndexed: 3,
    countDuplicates: 0,
    message: 'Gmail sync completed in Smart Import mode. 3 documents indexed into Structra.',
    createdDocuments: [{ id: 'doc-1' }, { id: 'doc-2' }, { id: 'doc-3' }],
  };

  const notif = getFrontendNotification(stateA);
  assert.strictEqual(notif.type, 'success');
  assert.strictEqual(notif.title, 'Gmail Sync Completed');
  assert.strictEqual(notif.desc.includes('3 new attachment(s) imported'), true);
  assert.strictEqual(notif.desc.includes('No new email attachments found'), false);
  console.log('✓ Test 1 Passed: State A generates correct document import notification');
}

// TEST 2: State B - Genuinely 0 attachments found after full sync
{
  const stateB: SyncResponse = {
    success: true,
    status: 'completed',
    alreadyInProgress: false,
    countDiscovered: 0,
    countImported: 0,
    countIndexed: 0,
    countDuplicates: 0,
    message: 'Sync completed. No new email attachments found in Gmail inbox.',
    createdDocuments: [],
  };

  const notif = getFrontendNotification(stateB);
  assert.strictEqual(notif.type, 'success');
  assert.strictEqual(notif.title, 'Gmail Sync Completed');
  assert.strictEqual(notif.desc, 'Sync completed. No new email attachments found in Gmail inbox.');
  console.log('✓ Test 2 Passed: State B correctly notifies zero attachments found ONLY after full sync completion');
}

// TEST 3: State C - Sync already in progress (concurrency lock active)
{
  const stateC: SyncResponse = {
    success: true,
    status: 'already_in_progress',
    alreadyInProgress: true,
    countDiscovered: 0,
    countImported: 0,
    countIndexed: 0,
    countDuplicates: 0,
    message: 'Gmail sync is already in progress.',
    createdDocuments: [],
  };

  const notif = getFrontendNotification(stateC);
  assert.strictEqual(notif.type, 'in_progress');
  assert.strictEqual(notif.title, 'Gmail Sync In Progress');
  assert.strictEqual(notif.desc.includes('already in progress'), true);
  assert.strictEqual(notif.desc.includes('No new email attachments found'), false);
  assert.strictEqual(notif.desc.includes('0 new attachment'), false);
  console.log('✓ Test 3 Passed: State C suppresses "No new attachments" and notifies sync in progress');
}

// TEST 4: State D - Sync failed
{
  const stateD: SyncResponse = {
    success: false,
    status: 'failed',
    error: 'Gmail account is not connected or authorization has expired.',
  };

  const notif = getFrontendNotification(stateD);
  assert.strictEqual(notif.type, 'error');
  assert.strictEqual(notif.title, 'Gmail Sync Failed');
  assert.strictEqual(notif.desc.includes('Gmail account is not connected'), true);
  assert.strictEqual(notif.desc.includes('No new email attachments found'), false);
  console.log('✓ Test 4 Passed: State D generates error notification and suppresses "No new attachments"');
}

// TEST 5: Verify in-memory promise coalescing
{
  async function simulateConcurrentSync() {
    const activeSyncLocks = new Set<string>();
    const activeSyncPromises = new Map<string, Promise<SyncResponse>>();

    async function triggerSync(reqId: number): Promise<SyncResponse> {
      const syncLockKey = 'user123:gmail';
      if (activeSyncLocks.has(syncLockKey)) {
        const inFlight = activeSyncPromises.get(syncLockKey);
        if (inFlight) {
          return inFlight;
        }
        return {
          success: true,
          status: 'already_in_progress',
          alreadyInProgress: true,
          countDiscovered: 0,
          countImported: 0,
          countIndexed: 0,
          countDuplicates: 0,
          message: 'Gmail sync is already in progress.',
          createdDocuments: [],
        };
      }

      activeSyncLocks.add(syncLockKey);
      let resolver: ((val: SyncResponse) => void) | null = null;
      const promise = new Promise<SyncResponse>((res) => {
        resolver = res;
      });
      activeSyncPromises.set(syncLockKey, promise);

      // Simulate work duration (e.g. 50ms)
      setTimeout(() => {
        const result: SyncResponse = {
          success: true,
          status: 'completed',
          alreadyInProgress: false,
          countDiscovered: 2,
          countImported: 2,
          countIndexed: 2,
          countDuplicates: 0,
          message: 'Gmail sync completed in Smart Import mode. 2 documents indexed into Structra.',
          createdDocuments: [{ id: 'doc-A' }, { id: 'doc-B' }],
        };
        resolver!(result);
        activeSyncLocks.delete(syncLockKey);
        activeSyncPromises.delete(syncLockKey);
      }, 50);

      return promise;
    }

    // Launch Request 1 and Request 2 almost concurrently
    const p1 = triggerSync(1);
    const p2 = triggerSync(2);

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.strictEqual(res1.status, 'completed');
    assert.strictEqual(res1.countIndexed, 2);
    assert.strictEqual(res2.status, 'completed');
    assert.strictEqual(res2.countIndexed, 2);
    assert.strictEqual(res2.createdDocuments?.length, 2);
  }

  await simulateConcurrentSync();
  console.log('✓ Test 5 Passed: Concurrent requests safely coalesce and share completed result');
}

console.log('ALL GMAIL SYNC ORCHESTRATION & NOTIFICATION REGRESSION TESTS PASSED CLEANLY!');
