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
        assert.equal(vm.runInContext('canBookActivity()', context), true);
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
assert.equal((html.match(/onclick="openHomeColumn\('/g) || []).length, 4);
assert.equal(shared.includes('<video'), false);
assert.equal((index.match(/v=20261121-phase9/g) || []).length, 4);
for (const file of ['wang-mudi-voice.m4a', 'tao-jin-voice.m4a']) {
    assert.ok(fs.existsSync(path.join(__dirname, 'assets', 'teachers', file)));
}
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1]);
}
console.log('PASS: three-phase gates, entry guards, four columns, audio assets and script syntax.');
