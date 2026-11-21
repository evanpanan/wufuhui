/* 三期共享的严选、老师 AI 分身和五富评估原型。 */
function experienceImage(prompt, size = 'square') {
    return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
}

const TEACHER_AVATARS = {
    mudi: {
        name: '王牧笛老师', focus: '全球视野 · 产业与趋势',
        image: './assets/teachers/wang-mudi.jpeg', hasPhoto: true,
        video: './assets/teachers/wang-mudi-reference.mp4',
        videoTopic: '2026 油价暴涨，对普通人的影响',
        greeting: '想聊全球趋势，还是家庭资产配置？我们先从你的目标开始。',
        prompts: ['怎样看全球资产配置？', '如何平衡现金流与长期配置？', '如何规划家人的健康保障？']
    },
    tao: {
        name: '陶矜老师', focus: '家族规划 · 保障与传承',
        image: './assets/teachers/tao-jin.webp', hasPhoto: true,
        video: './assets/teachers/tao-jin-reference.mp4',
        videoTopic: '智慧人生与认知成长',
        greeting: '想先梳理家庭保障，还是传承安排？把最关心的问题告诉我。',
        prompts: ['如何选择香港高端医疗服务？', '家族传承应该从哪里开始？', '香港保险需要关注哪些条款？']
    }
};
const TEACHER_PORTRAIT_KEY = 'tdh-teacher-portrait-v1-';
function loadTeacherPortraits() {
    Object.entries(TEACHER_AVATARS).forEach(([key, teacher]) => {
        try {
            const image = localStorage.getItem(TEACHER_PORTRAIT_KEY + key);
            if (/^data:image\/(jpeg|png|webp);base64,/.test(image || '')) {
                teacher.image = image;
                teacher.hasPhoto = true;
            }
        } catch (_) {}
    });
}
loadTeacherPortraits();
function chooseTeacherPortrait() {
    document.getElementById('teacher-portrait-file').click();
}
function importTeacherPortrait(file) {
    if (!file) return;
    const key = currentTeacher;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
        setVoiceStatus('请选择小于 15 MB 的 JPG、PNG 或 WebP 照片。');
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => setVoiceStatus('照片读取失败，请重新选择。');
    reader.onload = () => {
        const image = new Image();
        image.onerror = () => setVoiceStatus('无法解码照片，请重新选择。');
        image.onload = () => {
            const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            const portrait = canvas.toDataURL('image/jpeg', 0.88);
            TEACHER_AVATARS[key].image = portrait;
            TEACHER_AVATARS[key].hasPhoto = true;
            let saved = true;
            try { localStorage.setItem(TEACHER_PORTRAIT_KEY + key, portrait); } catch (_) { saved = false; }
            renderTeacherCards();
            if (currentTeacher === key) {
                updateTeacherPortrait();
                setVoiceStatus(saved ? '形象已更新，同一浏览器三期共用。' : '形象已更新；存储不可用，本次会话有效。');
            }
        };
        image.src = reader.result;
    };
    reader.readAsDataURL(file);
}

const HEALTH_PRODUCTS = [
    {
        id: 'health-probiotics', title: '日常营养 · 复合益生菌', type: '营养保健', category: 'nutrition',
        tag: '日常营养', price: 398,
        img: experienceImage('Premium probiotic supplement amber glass bottle with cream packaging on warm peach travertine pedestal, soft natural sunlight, botanical accent, realistic luxury wellness product photography, no readable text'),
        subtitle: '30 日装 · 日常营养补充', format: '实物寄送 · 30 日装',
        desc: '日常营养补充的产品示例。选购前请核对菌株、配料、保质期及储存要求；有基础疾病、孕期或正在用药时先咨询医生。',
        highlights: ['核对菌株与配料信息', '关注储存与运输要求', '不作为疾病治疗手段']
    },
    {
        id: 'health-hk', title: '香港高端医疗 · 专属体检', type: '医疗服务', category: 'medical',
        tag: '香港医疗', price: 6800,
        img: experienceImage('Premium Hong Kong private medical examination suite, cool teal glass partitions, clean modern diagnostic equipment, panoramic harbour daylight, realistic architectural photography'),
        subtitle: '体检项目沟通 · 中文服务对接', format: '香港到院 · 预约服务',
        desc: '提供体检需求沟通与预约对接的服务示例。具体项目、医生、机构资质及费用须在预约前确认，检查安排以医生评估为准。',
        highlights: ['预约前核对检查项目', '中文服务沟通', '体检后报告解读安排']
    },
    {
        id: 'health-omega', title: '日常营养 · Omega-3 鱼油', type: '营养保健', category: 'nutrition',
        tag: '营养补充', price: 568,
        img: experienceImage('Premium omega-3 fish oil dark blue bottle with golden softgel capsules on ivory stone, warm honey sunlight, precise realistic luxury supplement product photography, no readable text'),
        subtitle: '60 粒装 · 日常营养补充', format: '实物寄送 · 60 粒装',
        desc: '营养补充产品示例。请核对成分、剂量与过敏提示；正在使用抗凝药物或计划手术时先向医生确认，不替代正常饮食与治疗。',
        highlights: ['核对 EPA 与 DHA 含量', '关注过敏与用药提示', '按实际标签说明使用']
    },
    {
        id: 'health-consult', title: '香港医疗 · 专科咨询对接', type: '医疗服务', category: 'medical',
        tag: '专科咨询', price: 1800,
        img: experienceImage('Quiet premium specialist consultation room in Hong Kong, slate blue wall, bright white furniture, medical records on desk, soft cool daylight, photorealistic high end healthcare interior'),
        subtitle: '专科需求沟通 · 预约对接', format: '香港到院 · 咨询服务',
        desc: '专科咨询预约对接示例。预约前确认就诊需求、病历材料、服务范围与收费；诊断、治疗及转诊决定由执业医生作出。',
        highlights: ['病历资料准备清单', '专科预约沟通', '确认费用与服务边界']
    }
];
appState.mallProducts = HEALTH_PRODUCTS;
IMG.mallHero = experienceImage('Premium wellness collection with amber supplement bottle and ivory packaging beside a clean modern Hong Kong private clinic window, warm stone and cool teal contrast, realistic editorial health photography, wide composition, no text', 'landscape_16_9');

let currentMallFilter = 'all';
function filterMallProducts(category) {
    currentMallFilter = ['all', 'nutrition', 'medical'].includes(category) ? category : 'all';
    document.querySelectorAll('[data-mall-filter]').forEach(button => {
        const active = button.dataset.mallFilter === currentMallFilter;
        button.setAttribute('aria-pressed', String(active));
        button.className = `px-4 py-2 rounded-full text-xs border font-bold ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`;
    });
    renderMallProducts();
}

function renderTeacherCards() {
    document.getElementById('teacher-avatar-cards').innerHTML = Object.entries(TEACHER_AVATARS).map(([key, teacher]) => `
        <button onclick="openTeacherChat('${key}')" class="teacher-card text-left">
            <img src="${teacher.image}" alt="${teacher.name}${teacher.hasPhoto ? '照片形象' : 'AI 分身概念形象'}">
            <span class="teacher-card-shade"></span>
            <span class="teacher-card-tag">AI 分身</span>
            <span class="teacher-card-copy">
                <strong>${teacher.name}</strong>
                <span>${teacher.focus}</span>
                <span class="teacher-card-action">开始对话 <i class="fa-solid fa-arrow-right"></i></span>
            </span>
        </button>`).join('');
}

let currentTeacher = 'mudi';
const teacherConversations = { mudi: [], tao: [] };
const modalFocus = {};
function openExperienceModal(id) {
    modalFocus[id] = document.activeElement;
    const modal = document.getElementById(id);
    document.querySelectorAll('.experience-overlay:not(.hidden)').forEach(overlay => { overlay.inert = true; });
    modal.inert = false;
    modal.classList.remove('hidden');
    document.body.classList.add('experience-modal-open');
    modal.querySelector('button, input')?.focus({ preventScroll: true });
}
function closeExperienceModal(id) {
    if (id === 'teacher-reference-modal') stopTeacherReference();
    if (id === 'ai-chat-modal') {
        stopVoiceRecognition();
        stopTeacherVoice();
        setTeacherMode('text');
    }
    document.getElementById(id).classList.add('hidden');
    const visible = [...document.querySelectorAll('.experience-overlay:not(.hidden)')];
    visible.forEach((overlay, index) => { overlay.inert = index !== visible.length - 1; });
    if (!document.querySelector('.experience-overlay:not(.hidden)')) document.body.classList.remove('experience-modal-open');
    modalFocus[id]?.focus({ preventScroll: true });
}
function stopTeacherReference() {
    const video = document.getElementById('teacher-reference-video');
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
    }
}
function openTeacherReference() {
    stopVoiceRecognition();
    stopTeacherVoice();
    const teacher = TEACHER_AVATARS[currentTeacher];
    document.getElementById('teacher-reference-title').textContent = `${teacher.name} · 原声素材`;
    document.getElementById('teacher-reference-topic').textContent = teacher.videoTopic;
    document.getElementById('teacher-reference-video').src = teacher.video;
    openExperienceModal('teacher-reference-modal');
}

function toggleAiChat() {
    const modal = document.getElementById('ai-chat-modal');
    if (modal.classList.contains('hidden')) openTeacherChat(currentTeacher);
    else closeExperienceModal('ai-chat-modal');
}
function openTeacherChat(key = 'mudi', question = '') {
    stopVoiceRecognition();
    stopTeacherVoice();
    setTeacherMode('text');
    currentTeacher = TEACHER_AVATARS[key] ? key : 'mudi';
    renderTeacherChat();
    openExperienceModal('ai-chat-modal');
    if (question) quickAsk(question);
}
function discussViewingTopic() {
    const title = document.getElementById('live-modal-title').textContent;
    const speaker = document.getElementById('live-modal-speaker').textContent;
    openTeacherChat(speaker.includes('牧笛') ? 'mudi' : 'tao', `我想聊这个主题：${title}`);
}
function switchTeacher(key) {
    if (!TEACHER_AVATARS[key]) return;
    stopVoiceRecognition();
    stopTeacherVoice();
    currentTeacher = key;
    document.getElementById('chat-input').value = '';
    renderTeacherChat();
}
function renderTeacherChat() {
    const teacher = TEACHER_AVATARS[currentTeacher];
    document.getElementById('teacher-chat-name').textContent = `${teacher.name} · AI 分身`;
    document.getElementById('teacher-chat-focus').textContent = teacher.focus;
    updateTeacherPortrait();
    setVoiceStatus('点击麦克风开始说话，也可以随时打字。');
    document.querySelectorAll('[data-teacher]').forEach(button => {
        const active = button.dataset.teacher === currentTeacher;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    const box = document.getElementById('chat-box');
    box.replaceChildren();
    appendTeacherMessage('assistant', teacher.greeting);
    teacherConversations[currentTeacher].forEach(message => appendTeacherMessage(message.role, message.text));
    document.getElementById('teacher-chat-prompts').innerHTML = teacher.prompts.map((question, index) =>
        `<button onclick="quickAsk(TEACHER_AVATARS[currentTeacher].prompts[${index}])">${question}</button>`).join('');
    updateCallCaption();
}
function updateTeacherPortrait() {
    const teacher = TEACHER_AVATARS[currentTeacher];
    ['teacher-chat-avatar', 'teacher-call-avatar'].forEach(id => {
        const portrait = document.getElementById(id);
        portrait.src = teacher.image;
        portrait.alt = `${teacher.name}${teacher.hasPhoto ? '照片形象' : '概念形象'}`;
    });
    document.getElementById('teacher-portrait-source').textContent = teacher.hasPhoto ? '照片形象 · AI 分身' : '概念形象 · 待接入老师原图';
    document.getElementById('teacher-call-name').textContent = teacher.name;
    document.getElementById('teacher-call-source').textContent = teacher.hasPhoto ? '照片形象展示，尚未接入口型驱动' : '概念形象演示，尚未接入老师原图';
}
function appendTeacherMessage(role, text) {
    const box = document.getElementById('chat-box');
    const bubble = document.createElement('div');
    bubble.className = `teacher-message ${role === 'user' ? 'user' : 'assistant'}`;
    const label = document.createElement('span');
    label.className = 'teacher-message-label';
    label.textContent = role === 'user' ? '你' : `${TEACHER_AVATARS[currentTeacher].name} AI`;
    const content = document.createElement('p');
    content.textContent = text;
    bubble.append(label, content);
    box.append(bubble);
    box.scrollTop = box.scrollHeight;
}

/* 当前为本地规则演示，不调用老师知识库，也不模拟真实个人观点。 */
function buildTeacherReply(text, key, history) {
    const previous = [...history].reverse().find(message => message.role === 'user' && message.text !== text);
    const context = /继续|具体|展开|为什么|下一步/.test(text) && previous ? `${previous.text} ${text}` : text;
    const opening = key === 'mudi' ? '先把目标和取舍说清楚。' : '先梳理家庭需求，再确认实施边界。';
    if (/评估|评分|短板/.test(context)) {
        const report = getSavedAssessment();
        if (!report) return `${opening}可以先到“我的”完成 AI 五富评估，找出最需要补齐的方向。`;
        const gap = getAssessmentPriorities(report.answers)[0];
        return `${opening}你的自评中，可以优先${gap.score >= 75 ? '复核' : '关注'}“${gap.name}”。${gap.action}这份结果只反映自评答案，不是投资适当性结论，也不会改变会员徽章。`;
    }
    if (/益生菌|鱼油|保健|营养/.test(context)) {
        return `${opening}选营养补充品先看成分、剂量、储存条件与自己的用药情况，不把它当作药物。益生菌要核对具体菌株，鱼油要关注过敏及抗凝药物提示。有疾病或用药史，先问执业医生；严选中的商品可以查看配料核对要点。`;
    }
    if (/医疗|健康|体检|就医/.test(context)) {
        return `${opening}香港高端医疗服务可以从三件事核对：机构及医生资质、实际检查或咨询项目、包含和不包含的费用。先整理家族病史和已有检查，再由医生确定项目。可以在严选选择体检或专科咨询对接；不建议凭套餐名称决定诊疗。`;
    }
    if (/保险|港险|保单/.test(context)) {
        return `${opening}先列出保障对象、已有保单与年度预算，再逐项核对保障范围、除外责任、缴费年限、币种和退保成本。分红中的非保证部分不能当作承诺收益。跨境投保与税务事项应向持牌专业人士确认。`;
    }
    if (/家族|传承|信托|家办/.test(context)) {
        return key === 'tao'
            ? '先列家庭成员、资产归属和现有保障，再明确传承对象及分配意愿。之后请律师、税务顾问核对身份、持有结构与当地规则。信托不是通用的风险隔离保证，具体效力取决于法律与实际安排。你最关心的是传承意愿，还是资产归属？'
            : '从长期家庭目标倒推安排：经营现金流、家庭保障与传承资金各自承担什么任务？先分清三者，再讨论跨地区和代际配置。涉及信托或税务时，交给专业人士核对具体实施。你准备先梳理哪一部分？';
    }
    if (/股票|港美|收益|配置|资产|趋势|现金流/.test(context)) {
        return key === 'mudi'
            ? '看全球配置，先看家庭支出的币种、未来三年的现金需求和可接受损失。将应急资金与长期资金分开，再比较不同地区、资产和行业的集中度。不要用预测点位代替配置纪律，也不承诺收益。你希望先保留流动性，还是讨论长期配置？'
            : '先确定家庭负债、应急储备与保障缺口，再讨论资产配置。把预计使用时间和支出币种逐项写下来，有助于判断哪些资金不适合承担波动。具体投资选择需结合风险承受能力，由合资格顾问确认。';
    }
    if (/直播|回放|录播/.test(context)) return '直播和回放都在首页；点击“精选回放”的“查看更多”即可进入完整回放页，没有独立录播频道。';
    if (/活动|报名|游学/.test(context)) return '可以在“活动”查看时间、地点与费用，再填写报名信息。支付为原型模拟，完成后会同步订单记录和我的行程。';
    return `${opening}你提到“${text.slice(0, 100)}”。当前是对话演示，我还没有接入老师的授权演讲知识库。可以继续聊家庭资产配置、传承规划或健康保障；复杂问题应交给相应的专业人士确认。`;
}
function handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        sendMessage();
    }
}
function sendMessage(readAloud = false) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim().slice(0, 1000);
    if (!text) return;
    stopVoiceRecognition();
    stopTeacherVoice();
    const history = teacherConversations[currentTeacher];
    history.push({ role: 'user', text });
    appendTeacherMessage('user', text);
    input.value = '';
    const reply = buildTeacherReply(text, currentTeacher, history);
    history.push({ role: 'assistant', text: reply });
    appendTeacherMessage('assistant', reply);
    updateCallCaption();
    if (readAloud && !voiceMuted) speakTeacherText(reply);
}
function quickAsk(question) {
    document.getElementById('chat-input').value = question;
    sendMessage();
}
let teacherMode = 'text';
let voiceMuted = false;
let recognition = null;
let recognitionSequence = 0;
let speechSequence = 0;
let teacherSpeaking = false;
function setVoiceStatus(text) {
    ['teacher-voice-status', 'teacher-call-status'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    });
}
function updateCallCaption() {
    const history = teacherConversations[currentTeacher];
    const user = [...history].reverse().find(message => message.role === 'user');
    const reply = [...history].reverse().find(message => message.role === 'assistant');
    document.getElementById('teacher-call-question').textContent = user ? `你：${user.text}` : '聊聊你的目标，我在这里听。';
    document.getElementById('teacher-call-caption').textContent = reply?.text || TEACHER_AVATARS[currentTeacher].greeting;
}
function setTeacherMode(mode) {
    teacherMode = mode === 'voice' ? 'voice' : 'text';
    const dialog = document.querySelector('.teacher-dialog');
    if (!dialog) return;
    dialog.classList.toggle('voice-mode', teacherMode === 'voice');
    document.getElementById('teacher-text-panel').hidden = teacherMode === 'voice';
    document.getElementById('teacher-call-panel').hidden = teacherMode !== 'voice';
}
function startTeacherCall() {
    stopVoiceRecognition();
    stopTeacherVoice();
    setTeacherMode('voice');
    updateCallCaption();
    setVoiceStatus('点击下方麦克风开始说话');
    document.getElementById('teacher-call-mic').focus({ preventScroll: true });
    if (!voiceMuted) previewTeacherVoice();
}
function endTeacherCall() {
    stopVoiceRecognition();
    stopTeacherVoice();
    setTeacherMode('text');
    setVoiceStatus('已结束语音，聊天记录已保留。');
    document.getElementById('chat-input').focus({ preventScroll: true });
}
function toggleVoiceMuted() {
    voiceMuted = !voiceMuted;
    if (voiceMuted) stopTeacherVoice();
    const button = document.getElementById('teacher-call-speaker');
    button.setAttribute('aria-pressed', String(voiceMuted));
    button.innerHTML = `<i class="fa-solid ${voiceMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i><span>${voiceMuted ? '已静音' : '朗读开启'}</span>`;
}
function setListeningUI(listening) {
    document.querySelector('.teacher-dialog')?.classList.toggle('listening', listening);
    ['teacher-call-mic', 'teacher-input-mic'].forEach(id => {
        const button = document.getElementById(id);
        if (!button) return;
        button.setAttribute('aria-pressed', String(listening));
        button.setAttribute('aria-label', listening ? '结束说话' : '开始语音输入');
    });
    const label = document.querySelector('#teacher-call-mic span');
    if (label) label.textContent = listening ? '说完点这里' : '点击说话';
}
function stopVoiceRecognition() {
    recognitionSequence++;
    const active = recognition;
    recognition = null;
    if (active) {
        active.onend = active.onerror = active.onresult = null;
        try { active.abort(); } catch (_) {}
    }
    setListeningUI(false);
}
function toggleVoiceInput() {
    if (recognition) {
        recognition.stop();
        setVoiceStatus('正在整理你说的话…');
        return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition || !window.isSecureContext) {
        setVoiceStatus(!Recognition ? '当前浏览器不支持语音识别，请使用 Chrome 或切回打字。' : '麦克风需要 HTTPS 或 localhost 环境，请切回打字。');
        return;
    }
    stopTeacherVoice();
    const session = ++recognitionSequence;
    const key = currentTeacher, mode = teacherMode;
    const active = new Recognition();
    recognition = active;
    active.lang = 'zh-CN';
    active.interimResults = true;
    active.continuous = false;
    let finalText = '', failed = false;
    const existingText = document.getElementById('chat-input').value.trim();
    active.onstart = () => {
        if (session !== recognitionSequence) return;
        setListeningUI(true);
        setVoiceStatus('正在听，请说话；说完可点击麦克风结束。');
    };
    active.onresult = event => {
        if (session !== recognitionSequence || currentTeacher !== key) return;
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index++) {
            const words = event.results[index][0].transcript;
            if (event.results[index].isFinal) finalText += words;
            else interim += words;
        }
        const transcript = (finalText + interim).slice(0, 1000);
        if (mode === 'text') document.getElementById('chat-input').value = (existingText + transcript).slice(0, 1000);
        else document.getElementById('teacher-call-question').textContent = `你：${transcript}`;
    };
    active.onerror = event => {
        if (session !== recognitionSequence) return;
        failed = true;
        const errors = {
            'not-allowed': '麦克风权限未开启，请在浏览器设置中允许，或切回打字。',
            'service-not-allowed': '语音识别服务不可用，请切回打字。',
            'audio-capture': '未检测到可用麦克风，请检查设备。',
            'no-speech': '没有听到声音，请再试一次。',
            network: '语音识别网络不可用，请检查网络或切回打字。',
            aborted: '已停止语音输入。'
        };
        setVoiceStatus(errors[event.error] || '语音识别暂不可用，请继续打字。');
        recognition = null;
        setListeningUI(false);
    };
    active.onend = () => {
        if (session !== recognitionSequence || currentTeacher !== key) return;
        recognition = null;
        setListeningUI(false);
        if (failed) return;
        if (!finalText.trim()) {
            setVoiceStatus('没有识别到完整语句，请重试或切回打字。');
            return;
        }
        if (mode === 'voice') {
            document.getElementById('chat-input').value = finalText.slice(0, 1000);
            sendMessage(true);
            if (!teacherSpeaking) setVoiceStatus('点击麦克风，继续下一句。');
        } else {
            setVoiceStatus('已转为文字，请确认后发送。');
            document.getElementById('chat-input').focus({ preventScroll: true });
        }
    };
    try { active.start(); } catch (_) {
        stopVoiceRecognition();
        setVoiceStatus('无法启动麦克风，请重试或继续打字。');
    }
}
function stopTeacherVoice() {
    speechSequence++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    teacherSpeaking = false;
    document.querySelector('.teacher-dialog')?.classList.remove('speaking');
    const button = document.getElementById('teacher-voice-button');
    if (button) button.textContent = '朗读回答';
}
function speakTeacherText(text) {
    stopTeacherVoice();
    if (!('speechSynthesis' in window)) {
        setVoiceStatus('当前浏览器不支持朗读，文字回答仍可查看。');
        return;
    }
    const session = speechSequence;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(item => /^zh[-_]CN/i.test(item.lang)) || voices.find(item => /^zh/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
        if (session !== speechSequence) return;
        teacherSpeaking = true;
        document.querySelector('.teacher-dialog').classList.add('speaking');
        document.getElementById('teacher-voice-button').textContent = '停止朗读';
        setVoiceStatus('正在朗读 · 浏览器系统声线');
    };
    utterance.onend = () => {
        if (session !== speechSequence) return;
        stopTeacherVoice();
        setVoiceStatus('点击麦克风继续说话，也可以切回打字。');
    };
    utterance.onerror = () => {
        if (session !== speechSequence) return;
        stopTeacherVoice();
        setVoiceStatus('朗读暂不可用，请查看文字回答。');
    };
    window.speechSynthesis.speak(utterance);
}
function previewTeacherVoice() {
    if (teacherSpeaking) { stopTeacherVoice(); setVoiceStatus('已停止朗读。'); return; }
    stopVoiceRecognition();
    const latest = [...teacherConversations[currentTeacher]].reverse().find(message => message.role === 'assistant');
    speakTeacherText(latest?.text || TEACHER_AVATARS[currentTeacher].greeting);
}

const WEALTH_DIMENSIONS = [
    { name: '香港保险', question: '家庭保障与香港保险，你准备到哪一步？', options: ['尚未梳理保障缺口', '已有保单，尚未定期复核', '已核对保障与长期缴费安排'], action: '先整理已有保单、保障对象与预算，再与持牌顾问复核缺口。' },
    { name: '港美股', question: '港美股配置，你的风险与现金流安排如何？', options: ['尚未确定资金使用期限', '有配置，但缺少集中度复核', '已明确资金期限与风险纪律'], action: '先分开应急资金和长期资金，再核对行业集中度及币种风险。' },
    { name: '高端医疗', question: '家人的健康保障与就医路径准备如何？', options: ['尚未形成健康与就医计划', '定期体检，但转诊路径不清晰', '已有体检计划与就医衔接安排'], action: '整理家族病史、保障与体检记录，向医生确认检查及转诊需求。' },
    { name: '全球房产', question: '全球房产的持有与退出安排清晰吗？', options: ['尚未梳理持有或配置需求', '已持有或关注，但成本不完整', '已核对成本、归属及退出路径'], action: '核对持有成本、所在地税费和流动性，不以名义租金判断回报。' },
    { name: '家族办公室', question: '家族治理与传承，你规划到哪一步？', options: ['尚未明确资产归属与传承意愿', '已有初步计划，待专业复核', '已梳理归属、意愿与专业支持'], action: '先明确家庭成员、资产归属和传承意愿，再请律师及税务顾问核对。' }
];
const ASSESSMENT_SCORES = [20, 55, 85];
const ASSESSMENT_STORAGE_KEY = 'tdh-five-wealth-assessment-v1';
let assessmentStep = 0;
let assessmentDraft = Array(5).fill(null);
let memoryAssessment = null;
function getSavedAssessment() {
    if (memoryAssessment) return memoryAssessment;
    try {
        const stored = JSON.parse(localStorage.getItem(ASSESSMENT_STORAGE_KEY));
        if (stored?.version === 1 && stored.answers?.length === 5 && stored.answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 2)) return stored;
    } catch (_) { /* 禁用本地存储时仍可完成本次评估。 */ }
    return null;
}
function getAssessmentPriorities(answers) {
    return WEALTH_DIMENSIONS.map((dimension, index) => ({ ...dimension, score: ASSESSMENT_SCORES[answers[index]], index }))
        .sort((a, b) => a.score - b.score);
}
function openWealthAssessment() {
    const report = getSavedAssessment();
    if (report) renderAssessmentReport(report);
    else startWealthAssessment();
    openExperienceModal('wealth-assessment-modal');
}
function startWealthAssessment() {
    assessmentStep = 0;
    assessmentDraft = Array(5).fill(null);
    renderAssessmentQuestion();
}
function renderAssessmentQuestion() {
    const dimension = WEALTH_DIMENSIONS[assessmentStep];
    const content = document.getElementById('wealth-assessment-content');
    content.scrollTop = 0;
    content.innerHTML = `
        <div class="assessment-eyebrow">配置准备度自评 · ${assessmentStep + 1} / 5</div>
        <div class="assessment-progress" aria-label="评估进度">${WEALTH_DIMENSIONS.map((_, index) => `<button onclick="goAssessmentStep(${index})" aria-label="第 ${index + 1} 题" ${index > assessmentStep && assessmentDraft.slice(0, index).includes(null) ? 'disabled' : ''} class="${index === assessmentStep ? 'current' : assessmentDraft[index] !== null ? 'done' : ''}"></button>`).join('')}</div>
        <span class="assessment-dimension">${dimension.name}</span>
        <h3 class="assessment-question">${dimension.question}</h3>
        <div class="assessment-options">${dimension.options.map((option, index) => `<button onclick="selectAssessmentAnswer(${index})" aria-pressed="${assessmentDraft[assessmentStep] === index}" class="${assessmentDraft[assessmentStep] === index ? 'selected' : ''}"><span>${option}</span><i class="fa-solid fa-check"></i></button>`).join('')}</div>
        <div class="assessment-actions">
            <button onclick="goAssessmentStep(${assessmentStep - 1})" ${assessmentStep === 0 ? 'disabled' : ''}>上一题</button>
            <button class="primary" onclick="nextAssessmentStep()" ${assessmentDraft[assessmentStep] === null ? 'disabled' : ''}>${assessmentStep === 4 ? '查看评估' : '下一题'}</button>
        </div>
        <p class="assessment-footnote">自评结果仅供规划参考，不构成投资或医疗建议。</p>`;
    pinAssessmentActions();
}
function pinAssessmentActions() {
    const content = document.getElementById('wealth-assessment-content');
    const footer = document.getElementById('wealth-assessment-footer');
    footer.replaceChildren(content.querySelector('.assessment-actions'));
    content.scrollTop = 0;
}
function selectAssessmentAnswer(answer) {
    assessmentDraft[assessmentStep] = answer;
    renderAssessmentQuestion();
    document.querySelector('.assessment-options button.selected')?.focus();
}
function goAssessmentStep(step) {
    if (step < 0 || step > 4 || assessmentDraft.slice(0, step).includes(null)) return;
    assessmentStep = step;
    renderAssessmentQuestion();
}
function nextAssessmentStep() {
    if (assessmentDraft[assessmentStep] === null) return;
    if (assessmentStep < 4) goAssessmentStep(assessmentStep + 1);
    else {
        memoryAssessment = { version: 1, answers: [...assessmentDraft], date: new Date().toLocaleDateString('zh-CN') };
        try { localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(memoryAssessment)); } catch (_) {}
        renderAssessmentReport(memoryAssessment);
        updateAssessmentEntry();
    }
}
function assessmentRadar(answers) {
    const center = [160, 145], radius = 95;
    const point = (index, scale) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
        return [center[0] + Math.cos(angle) * radius * scale, center[1] + Math.sin(angle) * radius * scale];
    };
    const polygon = scale => WEALTH_DIMENSIONS.map((_, index) => point(index, scale).join(',')).join(' ');
    const shape = answers.map((answer, index) => point(index, ASSESSMENT_SCORES[answer] / 100).join(',')).join(' ');
    return `<svg viewBox="0 0 320 290" role="img" aria-label="五富配置准备度雷达图">
        ${[0.25, 0.5, 0.75, 1].map(scale => `<polygon points="${polygon(scale)}" fill="none" stroke="#d8d3c7"/>`).join('')}
        ${WEALTH_DIMENSIONS.map((_, index) => `<line x1="160" y1="145" x2="${point(index, 1)[0]}" y2="${point(index, 1)[1]}" stroke="#e4dfd5"/>`).join('')}
        <polygon class="assessment-radar-shape" points="${shape}" fill="#c9a65c40" stroke="#aa8032" stroke-width="2"/>
        ${WEALTH_DIMENSIONS.map((dimension, index) => {
            const position = point(index, 1.34);
            return `<text x="${position[0]}" y="${position[1]}" text-anchor="middle" font-size="12" fill="#334155">${dimension.name}<tspan x="${position[0]}" dy="17" fill="#987329">${ASSESSMENT_SCORES[answers[index]]}</tspan></text>`;
        }).join('')}
    </svg>`;
}
function renderAssessmentReport(report) {
    const priorities = getAssessmentPriorities(report.answers);
    const score = Math.round(report.answers.reduce((sum, answer) => sum + ASSESSMENT_SCORES[answer], 0) / 5);
    document.getElementById('wealth-assessment-content').innerHTML = `
        <div class="assessment-eyebrow">五富配置准备度 · ${report.date}</div>
        <div class="assessment-score"><strong>${score}</strong><span>/ 100 · 自评</span></div>
        <p class="assessment-report-title">${score >= 75 ? '规划已较清晰，继续定期复核' : score >= 45 ? '已有基础，补齐关键安排' : '从家庭需求开始梳理'}</p>
        <div class="assessment-radar">${assessmentRadar(report.answers)}</div>
        <h3 class="assessment-next-title">优先关注</h3>
        ${priorities.slice(0, 2).map(dimension => `<div class="assessment-priority"><strong>${dimension.name}</strong><p>${dimension.action}</p></div>`).join('')}
        <div class="assessment-actions">
            <button onclick="startWealthAssessment()">重新评估</button>
            <button class="primary" onclick="consultAssessment()">与 AI 分身聊规划</button>
        </div>
        <p class="assessment-footnote">本地自评演示；与会员徽章无关，不构成投资、税务或医疗建议。</p>`;
    pinAssessmentActions();
}
function consultAssessment() {
    closeExperienceModal('wealth-assessment-modal');
    openTeacherChat('tao', '根据我的五富评估，下一步优先补齐什么？');
}
function updateAssessmentEntry() {
    const report = getSavedAssessment();
    if (!report) return;
    const score = Math.round(report.answers.reduce((sum, answer) => sum + ASSESSMENT_SCORES[answer], 0) / 5);
    document.getElementById('ai-assessment-entry-summary').textContent = `配置准备度 ${score} · 查看评估`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="ai-chat-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-chat-name" class="experience-overlay hidden">
            <section class="experience-dialog teacher-dialog">
                <header class="experience-modal-header">
                    <h2 id="teacher-chat-name">老师 AI 分身</h2>
                    <button onclick="closeExperienceModal('ai-chat-modal')" aria-label="关闭 AI 对话"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="teacher-switch" role="tablist" aria-label="选择老师 AI 分身">
                    <button role="tab" data-teacher="mudi" onclick="switchTeacher('mudi')">王牧笛老师</button>
                    <button role="tab" data-teacher="tao" onclick="switchTeacher('tao')">陶矜老师</button>
                </div>
                <input type="file" id="teacher-portrait-file" accept="image/jpeg,image/png,image/webp" hidden onchange="importTeacherPortrait(this.files[0]); this.value = ''">
                <div id="teacher-text-panel" class="teacher-text-panel">
                <div id="teacher-chat-portrait" class="teacher-portrait">
                    <img id="teacher-chat-avatar" alt="AI 分身概念形象">
                    <div><p id="teacher-chat-focus"></p><span id="teacher-portrait-source">AI 分身形象</span>
                        <div class="teacher-portrait-actions">
                            <button id="teacher-voice-button" onclick="previewTeacherVoice()">朗读回答</button>
                            <button onclick="openTeacherReference()">老师原声</button>
                            <button onclick="chooseTeacherPortrait()" aria-label="导入当前老师照片">更换形象</button>
                        </div>
                        <small>系统声线 · 规则演示，非老师本人回答。</small>
                    </div>
                    <div class="teacher-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
                </div>
                <div id="chat-box" class="teacher-chat-box" role="log" aria-live="polite" aria-label="AI 对话记录"></div>
                <div id="teacher-chat-prompts" class="teacher-prompts"></div>
<form class="teacher-input" onsubmit="event.preventDefault(); sendMessage()">
                    <button id="teacher-input-mic" class="teacher-input-mic" type="button" onclick="toggleVoiceInput()" aria-label="开始语音输入" aria-pressed="false"><i class="fa-solid fa-microphone"></i></button>
                    <label class="sr-only" for="chat-input">输入问题</label>
                    <input id="chat-input" maxlength="1000" autocomplete="off" placeholder="输入问题，或点击麦克风…" onkeydown="handleChatKeyPress(event)">
                    <button type="submit">发送 <i class="fa-solid fa-arrow-up"></i></button>
                </form>
                <div class="teacher-chat-toolbar">
                    <p id="teacher-voice-status" role="status">支持打字与语音输入</p>
                    <button onclick="startTeacherCall()"><i class="fa-solid fa-headphones"></i> 语音对话</button>
                </div>
                </div>
                <section id="teacher-call-panel" class="teacher-call-panel" aria-label="老师分身语音对话" hidden>
                    <div class="teacher-call-stage">
                        <img id="teacher-call-avatar" alt="老师分身形象">
                        <div class="teacher-call-shade"></div>
                        <span class="teacher-call-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 分身 · 语音对话</span>
                        <button class="teacher-call-photo" onclick="openTeacherReference()"><i class="fa-solid fa-circle-play"></i> 老师原声</button>
                        <div class="teacher-call-identity">
                            <h3 id="teacher-call-name"></h3>
                            <span id="teacher-call-source"></span>
                        </div>
                        <div class="teacher-call-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                    </div>
                    <div class="teacher-call-transcript" role="log" aria-live="polite" aria-label="语音对话文字">
                        <p id="teacher-call-question"></p>
                        <p id="teacher-call-caption"></p>
                    </div>
                    <p id="teacher-call-status" class="teacher-call-status" role="status">点击麦克风开始说话</p>
                    <div class="teacher-call-controls">
                        <button id="teacher-call-speaker" onclick="toggleVoiceMuted()" aria-pressed="false"><i class="fa-solid fa-volume-high"></i><span>朗读开启</span></button>
                        <button id="teacher-call-mic" class="call-mic" onclick="toggleVoiceInput()" aria-label="开始语音输入" aria-pressed="false"><i class="fa-solid fa-microphone"></i><span>点击说话</span></button>
                        <button class="call-end" onclick="endTeacherCall()"><i class="fa-solid fa-phone-slash"></i><span>结束语音</span></button>
                    </div>
                    <button class="teacher-call-keyboard" onclick="endTeacherCall()"><i class="fa-solid fa-keyboard"></i> 切回打字，保留对话</button>
                    <p class="teacher-call-disclaimer">系统声线，非真人通话 · 识别由浏览器服务处理，需麦克风授权</p>
                </section>
            </section>
        </div>
        <div id="teacher-reference-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-reference-title" class="experience-overlay reference-overlay hidden">
            <section class="experience-dialog teacher-reference-dialog">
                <header class="experience-modal-header">
                    <h2 id="teacher-reference-title">老师原声素材</h2>
                    <button onclick="closeExperienceModal('teacher-reference-modal')" aria-label="关闭原声视频"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <video id="teacher-reference-video" controls playsinline preload="metadata" aria-label="老师原声素材视频" onerror="document.getElementById('teacher-reference-topic').textContent = '视频暂不可用，请关闭后继续对话。'"></video>
                <p id="teacher-reference-topic" class="teacher-reference-topic"></p>
                <p class="teacher-reference-note">原视频第 5 至 20 秒的素材片段，保留原声。不是 AI 回答，也不是声线克隆或实时口型。</p>
            </section>
        </div>
        <div id="wealth-assessment-modal" role="dialog" aria-modal="true" aria-labelledby="wealth-assessment-title" class="experience-overlay hidden">
            <section class="experience-dialog assessment-dialog">
                <header class="experience-modal-header">
                    <h2 id="wealth-assessment-title">AI 五富评估</h2>
                    <button onclick="closeExperienceModal('wealth-assessment-modal')" aria-label="关闭五富评估"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <div id="wealth-assessment-content" class="assessment-content" role="region" aria-label="五富评估内容" tabindex="0"></div>
                <footer id="wealth-assessment-footer" class="assessment-footer" aria-label="评估操作"></footer>
            </section>
        </div>`);
    updateAssessmentEntry();
    document.querySelectorAll('.experience-overlay').forEach(modal => {
        modal.addEventListener('click', event => { if (event.target === modal) closeExperienceModal(modal.id); });
        modal.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeExperienceModal(modal.id);
            if (event.key !== 'Tab') return;
            const elements = [...modal.querySelectorAll('button:not(:disabled), input, [tabindex="0"]')].filter(element => element.getClientRects().length);
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopVoiceRecognition();
            stopTeacherVoice();
            stopTeacherReference();
        }
    });
    window.addEventListener('pagehide', () => { stopVoiceRecognition(); stopTeacherVoice(); stopTeacherReference(); });
});
