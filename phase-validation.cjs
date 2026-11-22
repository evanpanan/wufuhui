const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'code_artifact.html'), 'utf8');
const shared = fs.readFileSync(path.join(__dirname, 'ai-experience.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const functionSource = name => {
    const match = html.match(new RegExp(`        function ${name}\\([^]*?\\n        \\}`));
    assert.ok(match, `Missing function: ${name}`);
    return match[0];
};

for (const phase of [1, 2, 3]) {
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id)) nodes.set(id, {
            attributes: {},
            closest() { return this; },
            setAttribute(key, value) { this.attributes[key] = value; }
        });
        return nodes.get(id);
    };
    const context = vm.createContext({
        PHASE: phase,
        appState: {},
        IMG: {},
        document: {
            body: { classList: { add() {}, remove() {} } },
            getElementById: node,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener() {}
        }
    });
    for (const name of ['getActivityEndTime', 'isActivityEnded', 'hasNativeActivityAccess', 'canBookActivity', 'getActivityGateText', 'getActivityRestrictionText']) {
        vm.runInContext(functionSource(name), context);
    }
    vm.runInContext(functionSource('applyPhaseGate'), context);
    vm.runInContext('applyPhaseGate()', context);
    assert.equal(node('page-mall').attributes['data-ph'], '2');
    assert.equal(node('trade-tab-goods').attributes['data-ph'], '2');
    if (phase < 3) {
        assert.equal(node('compliance-modal').attributes['data-ph'], '3');
        assert.equal(node('after-sales-modal').attributes['data-ph'], '3');
    }
    if (phase === 1) {
        assert.equal(node('user-tier-badge').attributes['data-ph'], '2');
        assert.equal(vm.runInContext('canBookActivity()', context), false);
        assert.equal(vm.runInContext('canBookActivity({ date: "2099-01-01", sortDate: "2099-01-01" })', context), true);
        assert.equal(vm.runInContext('canBookActivity({ status: "ended" })', context), false);
    }
    vm.runInContext(shared, context);
    if (phase < 3) {
        // These calls must return before touching a dialog or starting media.
        vm.runInContext('openTeacherChat(); openWealthAssessment(); sendCustomerServiceMessage(); openExperienceModal("ai-chat-modal")', context);
    }
    if (phase === 1) {
        for (const name of ['switchTab', 'openMallProductDetail', 'openMallBuyModal']) {
            vm.runInContext(functionSource(name), context);
        }
        vm.runInContext('switchTab("mall"); switchTab("channels"); openMallProductDetail("test"); openMallBuyModal("test")', context);
    }
}

assert.match(html, /<section data-ph="3" aria-label=/);
assert.match(html, /<button data-ph="3" id="ai-assessment-entry"/);
assert.match(html, /<button data-ph="2" onclick="switchTab\('mall'\)"/);
const mallPage = html.match(/<section id="page-mall"[^]*?<\/section>/)?.[0];
assert.ok(mallPage);
assert.doesNotMatch(mallPage, /onclick="switchTab\('home'\)"/);
assert.doesNotMatch(mallPage, /title="返回"/);
assert.equal((html.match(/onclick="openHomeColumn\('/g) || []).length, 4);
assert.equal(shared.includes('<video'), false);
assert.equal((index.match(/v=20261122-column19/g) || []).length, 4);
assert.match(html, /column-experience\.css/);
assert.match(shared, /id="home-column-cover-title"/);
assert.match(shared, /page\.dataset\.column = key/);
assert.doesNotMatch(html, /重磅直播预告|健康甄选|顶尖资源链接|查看订单记录|支付成功后自动锁定席位并同步/);
assert.match(html, /模拟支付，不会实际扣款。/);
assert.doesNotMatch(html, /点击日期查看当天安排|点击查看详情|活动与商品订单统一查看|系统会根据订单与账单流水自动识别/);
assert.doesNotMatch(shared, /点击麦克风开始说话|点击下方麦克风|也可以随时打字|支持打字与语音输入|点击麦克风继续说话|说完可点击麦克风|语音流程演示/);
assert.match(shared, /预录老师原声，仅演示回复，非实时回答。/);
assert.equal((index.match(/preview=1/g) || []).length, 4);
assert.match(html, /onclick="switchPreviewPhase\(\$\{n\}\)"/);
assert.match(html, /let PHASE =/);
assert.doesNotMatch(functionSource('switchPreviewPhase'), /location\.(href|assign|reload)\s*[=(]/);
const watching = fs.readFileSync(path.join(__dirname, 'watch-experience.js'), 'utf8');
new vm.Script(watching);
assert.doesNotMatch(watching, /可体验播放|可在下方参与讨论/);
assert.match(html, /watch-experience\.css/);
assert.match(html, /watch-experience\.js/);
assert.match(html, /<video id="watch-video" playsinline/);
assert.equal((html.match(/onclick="openReplayRoom\('/g) || []).length, 2);
assert.match(shared, /openReplayRoom\(item\.id\)/);
assert.match(watching, /media\.controls = !isLive/);
assert.doesNotMatch(html, /id="watch-replay-tools"|id="watch-chapters"|id="watch-save"/);
assert.doesNotMatch(watching, /function setRate|renderChapters|syncChapter|toggleSaved/);
assert.match(html, /controlslist="[^"]*noplaybackrate/);
assert.match(watching, /setTab\(isLive \? 'main' : 'about'\)/);
assert.match(watching, /addEventListener\('app-page-leave', leave\)/);
const navigation = fs.readFileSync(path.join(__dirname, 'mobile-navigation.js'), 'utf8');
new vm.Script(navigation);
assert.match(navigation, /const overlays = new Set\(\[[^]*?'e-ticket-modal'[^]*?'teacher-reference-modal'/);
assert.match(navigation, /setAttribute\('aria-modal', 'true'\)/);
assert.match(navigation, /visiblePages\.includes\(id\)/);
assert.match(html, /id="mobile-app-shell"/);
assert.match(html, /mobile-navigation\.css/);
assert.match(html, /mobile-navigation\.js/);
assert.match(navigation, /addEventListener\('popstate'/);
assert.match(navigation, /history\.go\(-count\)/);
assert.match(shared, /openAppPage\('teacher-call-page'\)/);
assert.equal(/getElementById\('[^']+-modal'\)\.classList\.remove\('hidden'\)/.test(html), false);
for (const file of ['wang-mudi-voice.m4a', 'tao-jin-voice.m4a']) {
    assert.ok(fs.existsSync(path.join(__dirname, 'assets', 'teachers', file)));
}
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1]);
}
console.log('PASS: three-phase gates, entry guards, four columns, audio assets and script syntax.');
