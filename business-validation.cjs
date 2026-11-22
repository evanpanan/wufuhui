const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'code_artifact.html'), 'utf8');
const source = name => {
    const match = html.match(new RegExp(`        function ${name}\\([^]*?\\n        \\}`));
    assert.ok(match, `Missing function: ${name}`);
    return match[0];
};
const nodes = new Map();
const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
        value: '', innerText: '', textContent: '', disabled: false,
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
    });
    return nodes.get(id);
};
let pageOpens = 0;
const user = {
    loggedIn: true, spentAmount: 0,
    badges: { health: { spent: 0, level: 0 }, family: { spent: 0, level: 0 } },
    account: {}, compliance: {}
};
const context = vm.createContext({
    PHASE: 3, appState: { currentUser: user, orders: [], consumptionRecords: [], myBookings: [], notifications: [] },
    BADGE_KEYWORDS: { health: ['医疗', '健康'], family: ['家族'] },
    BADGE_THRESHOLDS: [0, 1000, 10000], PAYMENT_METHOD_META: {},
    document: { getElementById: node },
    getMemberTierMetaBySpent: spent => ({ key: spent >= 10000 ? 'gold' : 'normal' }),
    updateBadgeUI() {}, renderMemberRights() {}, renderMyItineraryPreview() {},
    renderMyBookings() {}, renderActivities() {}, renderComplianceBanner() {},
    renderTradeRecords() {}, updateUnreadDot() {}, renderFakeQr() {}, showToast() {},
    openAppPage() { pageOpens++; },
    getNowString: () => '2026-11-22 12:00',
    refreshAccountViews() {}, hideLoginGate() {}, clearInterval() {},
    loginCountdownTimer: null, loginCodeSent: true,
    loginCodePhone: '13800138000', loginCodeExpiresAt: Date.now() + 60000,
    currentTicket: null
});
for (const name of ['matchBadgeKey', 'getBadgeLevelBySpent', 'recordConsumption', 'reclaimSpent',
    'refundOrder', 'hasPurchasedService', 'getActivityEndTime', 'isActivityEnded',
    'isValidContactPhone', 'renderETicket', 'openETicketModal', 'openETicketByOrder', 'checkInTicket', 'doLogin']) {
    vm.runInContext(source(name), context);
}
const run = text => vm.runInContext(text, context);

run('recordConsumption("one", "医疗服务", "严选", 12000, "2026-11-22")');
run('recordConsumption("one", "医疗服务", "严选", 12000, "2026-11-22")');
assert.equal(user.spentAmount, 12000);
assert.equal(user.badges.health.spent, 12000);
assert.equal(user.badges.health.level, 2);
assert.equal(context.appState.consumptionRecords.length, 1);
context.appState.orders.push(
    { id: 'one', title: '医疗服务', amount: 12000, status: '已支付' },
    { id: 'two', title: '医疗服务', amount: 12000, status: '已支付' }
);
run('recordConsumption("two", "医疗服务", "严选", 12000, "2026-11-22")');
context.appState.myBookings.push(
    { ticketNo: 'one', title: '医疗服务考察团' },
    { ticketNo: 'two', title: '医疗服务考察团' }
);
run('refundOrder("one"); refundOrder("one")');
assert.equal(user.spentAmount, 12000);
assert.equal(user.badges.health.spent, 12000);
assert.deepEqual(context.appState.myBookings.map(b => b.ticketNo), ['two']);
assert.equal(run('hasPurchasedService(["医疗"])'), true);
run('refundOrder("two")');
assert.equal(user.spentAmount, 0);
assert.equal(user.badges.health.spent, 0);
assert.equal(user.badges.health.level, 0);
assert.equal(run('hasPurchasedService(["医疗"])'), false);
run('PHASE = 2; recordConsumption("three", "健康服务", "严选", 100, "2026-11-22")');
context.appState.orders.push({ id: 'three', amount: 100, status: '已支付', title: '健康服务' });
run('refundOrder("three")');
assert.equal(user.spentAmount, 100);
run('PHASE = 3');

assert.equal(run('isActivityEnded({ date: "2020-01-01 (3天2晚)", sortDate: "2020-01-01" })'), true);
assert.equal(run('isActivityEnded({ date: "2099-12-30 至 01-02", sortDate: "2099-12-30" })'), false);
assert.equal(run('getActivityEndTime({ date: "2099-01-01 12:00-16:00" }) === new Date("2099-01-01T16:00:59.999").getTime()'), true);
assert.equal(run('isValidContactPhone("+852 9123 4567")'), true);
assert.equal(run('isValidContactPhone("138 **** 8888")'), false);

run('openETicketByOrder("three")');
assert.equal(pageOpens, 0, 'A product order must not produce an activity ticket');
const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const booking = { ticketNo: 'ticket', title: '活动', status: '审核中', sortDate: date, date, checkedIn: false };
const order = { id: 'ticket', title: '活动', status: '审核中', amount: 0 };
context.appState.myBookings.push(booking);
context.appState.orders.push(order);
run('openETicketModal("ticket")');
assert.equal(pageOpens, 0);
booking.status = order.status = '已确认';
run('openETicketModal("ticket"); checkInTicket(); checkInTicket()');
assert.equal(pageOpens, 1, 'Check-in must not navigate away from the ticket');
assert.equal(booking.status, '已参加');
assert.equal(order.status, '已完成');
assert.equal(booking.checkedIn, true);
assert.equal(context.appState.notifications.filter(n => n.title === '模拟签到成功').length, 1);

user.loggedIn = false;
node('login-phone').value = '13800138000';
node('login-code').value = '123456';
run('doLogin("phone")');
assert.equal(user.loggedIn, false);
node('login-code').value = '888888';
node('login-phone').value = '13900139000';
run('doLogin("phone")');
assert.equal(user.loggedIn, false);
node('login-phone').value = '13800138000';
run('loginCodeExpiresAt = 0; doLogin("phone")');
assert.equal(user.loggedIn, false);
run('loginCodeExpiresAt = Date.now() + 60000; doLogin("phone")');
assert.equal(user.loggedIn, true);
assert.equal(run('loginCodeSent'), false);
console.log('PASS: consumption and badges, exact and idempotent refunds, refunded rights, stage guards, activity dates, phone validation, ticket states, check-in and OTP.');
