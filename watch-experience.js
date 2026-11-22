/* Real media controls with separate live-preview and replay experiences. */
(function () {
    const sessions = new Map();
    let current;
    const el = id => document.getElementById(id);
    const video = () => el('watch-video');
    function setTab(tab) {
        for (const key of ['main', 'about']) {
            el('watch-tab-' + key).setAttribute('aria-selected', String(key === tab));
            el('watch-panel-' + key).hidden = key !== tab;
        }
    }
    function syncPlayback() {
        const media = video();
        el('watch-start').hidden = current?.mode === 'replay' || !media.paused;
        el('watch-live-play').setAttribute('aria-label', media.paused ? '播放' : '暂停');
        el('watch-live-play').innerHTML = `<i class="fa-solid fa-${media.paused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
    }
    function appendComment(name, text, own = false) {
        const row = document.createElement('div');
        row.className = 'watch-comment' + (own ? ' is-own' : '');
        const avatar = document.createElement('span');
        avatar.className = 'watch-comment-avatar';
        avatar.textContent = name.slice(0, 1);
        const copy = document.createElement('div');
        const author = document.createElement('strong');
        author.textContent = name;
        const message = document.createElement('p');
        message.textContent = text;
        copy.append(author, message);
        row.append(avatar, copy);
        el('watch-comments').append(row);
    }
    function syncLike() {
        el('watch-like').setAttribute('aria-pressed', String(current.liked));
        el('watch-like').querySelector('i').className = `fa-${current.liked ? 'solid' : 'regular'} fa-heart`;
        el('watch-like-count').textContent = 128 + Number(current.liked);
    }
    async function togglePlayback(forcePlay = false) {
        const media = video();
        if (!forcePlay && !media.paused) { media.pause(); return; }
        if (media.ended) media.currentTime = 0;
        try { await media.play(); }
        catch (error) {
            if (error.name === 'AbortError') return;
            syncPlayback();
            if (current) showToast('请点击视频播放；无法加载时请检查网络');
        }
    }
    function open(item) {
        video().pause();
        const key = item.mode === 'live' ? 'live:' + item.title : item.id;
        if (!sessions.has(key)) sessions.set(key, { liked: false, comments: [], position: 0 });
        current = Object.assign(sessions.get(key), item);
        const isLive = item.mode === 'live';
        const teacher = /牧笛/.test(item.speaker) ? 'wang-mudi' : 'tao-jin';
        const teacherName = teacher === 'wang-mudi' ? '王牧笛' : '陶矜';
        el('live-modal-title').textContent = item.title;
        el('live-modal-speaker').textContent = `主讲：${item.speaker}`;
        el('watch-kind').textContent = isLive ? '正在直播 · 模拟' : '直播回放';
        el('watch-meta').textContent = isLive ? '讨论仅在本机演示' : `${item.publishText || ''} · 原课程 ${item.duration || '--:--'}`;
        el('watch-status').textContent = isLive ? 'LIVE · 演示' : '回放 · 演示片段';
        el('watch-demo-note').textContent = isLive
            ? `使用${teacherName}老师素材循环模拟直播，非实时连线。`
            : `${teacherName}老师演示片段，非本课程实录。`;
        const description = item.overview || item.desc || '';
        el('watch-description').textContent = description;
        el('watch-description').hidden = !description;
        el('watch-description-title').hidden = !description;
        el('live-modal').classList.toggle('is-replay', !isLive);
        el('watch-tabs').hidden = !isLive;
        el('watch-panel-about').setAttribute('role', isLive ? 'tabpanel' : 'region');
        if (isLive) el('watch-panel-about').setAttribute('aria-labelledby', 'watch-tab-about');
        else el('watch-panel-about').removeAttribute('aria-labelledby');
        el('watch-comments').hidden = !isLive;
        el('watch-comment-form').hidden = !isLive;
        el('watch-live-controls').hidden = !isLive;
        el('watch-media-error').hidden = true;
        el('watch-comment-input').value = current.draft || '';
        el('watch-comments').replaceChildren();
        appendComment('主持人', '欢迎进入陶笛汇直播间。讨论区为本地演示，欢迎留下你的问题。');
        current.comments.forEach(text => appendComment('我', text, true));
        syncLike();
        setTab(isLive ? 'main' : 'about');
        const media = video();
        media.controls = !isLive;
        media.loop = isLive;
        media.muted = isLive;
        media.poster = `${location.pathname.replace(/[^/]*$/, '')}assets/teachers/${teacher}.${teacher === 'wang-mudi' ? 'jpeg' : 'webp'}`;
        media.src = `./assets/teachers/${teacher}-reference.mp4`;
        media.load();
        media.playbackRate = 1;
        el('live-modal').dataset.navigationTitle = isLive ? '直播间' : '直播回放';
        el('watch-mute').setAttribute('aria-label', '开启声音');
        el('watch-mute').innerHTML = '<i class="fa-solid fa-volume-xmark" aria-hidden="true"></i>';
        openAppPage('live-modal');
        el('app-page-title-live-modal').textContent = isLive ? '直播间' : '直播回放';
        syncPlayback();
        if (isLive) togglePlayback(true);
    }
    function leave() {
        if (current) {
            current.position = video().currentTime;
            current.draft = el('watch-comment-input').value;
        }
        video().pause();
        if (document.fullscreenElement === video()) document.exitFullscreen().catch(() => {});
    }
    window.WatchExperience = {
        open, setTab, togglePlayback,
        toggleLike() { if (current) { current.liked = !current.liked; syncLike(); } },
        toggleMute() {
            video().muted = !video().muted;
            el('watch-mute').setAttribute('aria-label', video().muted ? '开启声音' : '静音');
            el('watch-mute').innerHTML = `<i class="fa-solid fa-volume-${video().muted ? 'xmark' : 'high'}" aria-hidden="true"></i>`;
        },
        async fullscreen() {
            try {
                if (video().webkitEnterFullscreen) video().webkitEnterFullscreen();
                else if (video().requestFullscreen) await video().requestFullscreen();
                else showToast('当前浏览器不支持全屏，请横屏观看');
            } catch { showToast('当前浏览器无法进入全屏，请横屏观看'); }
        },
        sendComment() {
            if (current?.mode !== 'live') return;
            const text = el('watch-comment-input').value.trim();
            if (!text) return;
            if (current.comments.length >= 50) { showToast('本次演示最多发送 50 条讨论'); return; }
            current.comments.push(text);
            appendComment('我', text, true);
            current.draft = '';
            el('watch-comment-input').value = '';
            setTab('main');
            el('watch-comments').lastElementChild.scrollIntoView({ block: 'nearest' });
        }
    };
    document.addEventListener('DOMContentLoaded', () => {
        video().addEventListener('loadedmetadata', () => {
            if (current?.mode === 'replay') video().currentTime = Math.min(current.position, Math.max(0, video().duration - 0.1));
        });
        ['play', 'pause', 'ended'].forEach(event => video().addEventListener(event, syncPlayback));
        video().addEventListener('ratechange', () => {
            if (video().playbackRate !== 1) video().playbackRate = 1;
        });
        video().addEventListener('error', () => { el('watch-media-error').hidden = false; });
        el('live-modal').addEventListener('app-page-leave', leave);
        el('live-modal').addEventListener('app-page-enter', () => {
            if (current) el('app-page-title-live-modal').textContent = current.mode === 'live' ? '直播间' : '直播回放';
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
        window.addEventListener('pagehide', leave);
    });
})();
