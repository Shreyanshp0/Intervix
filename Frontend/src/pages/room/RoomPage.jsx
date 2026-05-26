import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Camera, CameraOff, ChevronRight, FileText, Lock, Mic, MicOff, MonitorUp, Pause, Play, Radio, ScreenShareOff, Send, Terminal, Unlock, Video, X } from 'lucide-react';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import { API_ROUTES } from '../../constants/apiRoutes';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';

const DEFAULT_CODE = `function solution(input) {
  return input;
}

console.log(solution('hello interview'));`;

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'java', label: 'Java' }
];

const stopStream = (stream) => stream?.getTracks?.().forEach((track) => track.stop());
const attachStream = (videoRef, stream) => { if (videoRef.current && videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream || null; };

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const socketRef = useRef(null);
  const mainPeerRef = useRef(null);
  const screenPeerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraVideoSenderRef = useRef(null);
  const audioSenderRef = useRef(null);
  const screenSenderRef = useRef(null);
  const remoteCameraStreamRef = useRef(new MediaStream());
  const remoteScreenStreamRef = useRef(new MediaStream());
  const localVideoRef = useRef(null);
  const remoteWebcamVideoRef = useRef(null);
  const remoteScreenVideoRef = useRef(null);
  const suppressEditorEventRef = useRef(false);
  const codeVersionRef = useRef(0);
  const rtcConfigRef = useRef({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
  const negotiationStateRef = useRef({ main: { makingOffer: false, ignoreOffer: false }, screen: { makingOffer: false, ignoreOffer: false } });
  const pendingCandidatesRef = useRef({ main: [], screen: [] });

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomReady, setRoomReady] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [role, setRole] = useState(user?.role || 'candidate');
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [executionStatus, setExecutionStatus] = useState('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);
  const [editorLocked, setEditorLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(true);
  const [remoteCursor, setRemoteCursor] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [quality, setQuality] = useState('unknown');

  const isRecruiter = role === 'recruiter' || role === 'admin';
  const isPolite = isRecruiter;
  const canEdit = !editorLocked || isRecruiter;
  const candidate = room?.candidate || {};
  const resume = candidate?.resume || {};
  const analytics = room?.analytics || {};
  const roomDetailsRoute = useMemo(() => user?.role === 'recruiter' || user?.role === 'admin' ? API_ROUTES.recruiter.liveInterviewDetails(roomId) : API_ROUTES.candidate.liveInterviewDetails(roomId), [roomId, user?.role]);
  const getPeerRef = useCallback((channel) => channel === 'screen' ? screenPeerRef : mainPeerRef, []);

  const emitDescription = useCallback((channel, description) => {
    if (!socketRef.current || !description) return;
    socketRef.current.emit(description.type === 'offer' ? 'webrtc_offer' : 'webrtc_answer', { roomId, channel, [description.type]: description });
  }, [roomId]);

  const flushIceQueue = useCallback(async (channel) => {
    const peer = getPeerRef(channel).current;
    if (!peer?.remoteDescription) return;
    const queue = pendingCandidatesRef.current[channel];
    while (queue.length) await peer.addIceCandidate(new RTCIceCandidate(queue.shift()));
  }, [getPeerRef]);

  const destroyScreenPeer = useCallback(() => {
    screenPeerRef.current?.close();
    screenPeerRef.current = null;
    pendingCandidatesRef.current.screen = [];
    negotiationStateRef.current.screen = { makingOffer: false, ignoreOffer: false };
    screenSenderRef.current = null;
    remoteScreenStreamRef.current = new MediaStream();
    attachStream(remoteScreenVideoRef, null);
    setRemoteScreenSharing(false);
  }, []);

  const createPeer = useCallback((channel) => {
    const peerRef = getPeerRef(channel);
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection(rtcConfigRef.current);
    peerRef.current = peer;
    peer.onicecandidate = (event) => event.candidate && socketRef.current?.emit('webrtc_ice_candidate', { roomId, channel, candidate: event.candidate });
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (channel === 'screen' && event.track.kind === 'video') {
        remoteScreenStreamRef.current = stream || new MediaStream([event.track]);
        attachStream(remoteScreenVideoRef, remoteScreenStreamRef.current);
        setRemoteScreenSharing(true);
        return;
      }
      if (event.track.kind === 'audio') {
        if (!remoteCameraStreamRef.current.getAudioTracks().includes(event.track)) remoteCameraStreamRef.current.addTrack(event.track);
        attachStream(remoteWebcamVideoRef, remoteCameraStreamRef.current);
        return;
      }
      if (!remoteCameraStreamRef.current.getVideoTracks().includes(event.track)) remoteCameraStreamRef.current.addTrack(event.track);
      attachStream(remoteWebcamVideoRef, stream || remoteCameraStreamRef.current);
    };
    peer.onconnectionstatechange = async () => {
      const state = peer.connectionState;
      if (channel === 'main') {
        setStatus(state === 'connected' ? 'Live' : state);
        if (state === 'connected') setQuality('good');
      }
      if (state === 'failed') await peer.restartIce().catch(() => {});
      if (['disconnected', 'closed'].includes(state) && channel === 'screen') setRemoteScreenSharing(false);
    };
    peer.onnegotiationneeded = async () => {
      const state = negotiationStateRef.current[channel];
      if (state.makingOffer || !peerRef.current) return;
      try {
        state.makingOffer = true;
        await peer.setLocalDescription(await peer.createOffer());
        emitDescription(channel, peer.localDescription);
      } finally {
        state.makingOffer = false;
      }
    };
    return peer;
  }, [emitDescription, getPeerRef, roomId]);

  const applyRemoteDescription = useCallback(async (channel, description) => {
    const peer = createPeer(channel);
    const state = negotiationStateRef.current[channel];
    const offerCollision = description.type === 'offer' && (state.makingOffer || peer.signalingState !== 'stable');
    state.ignoreOffer = !isPolite && offerCollision;
    if (state.ignoreOffer) return;
    await peer.setRemoteDescription(new RTCSessionDescription(description));
    await flushIceQueue(channel);
    if (description.type === 'offer') {
      await peer.setLocalDescription(await peer.createAnswer());
      emitDescription(channel, peer.localDescription);
    }
  }, [createPeer, emitDescription, flushIceQueue, isPolite]);

  const addIceCandidate = useCallback(async (channel, candidate) => {
    const peer = getPeerRef(channel).current;
    if (!peer || !peer.remoteDescription) {
      pendingCandidatesRef.current[channel].push(candidate);
      return;
    }
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }, [getPeerRef]);

  const cleanupMedia = useCallback(() => {
    stopStream(cameraStreamRef.current);
    stopStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    mainPeerRef.current?.close();
    mainPeerRef.current = null;
    destroyScreenPeer();
    cameraVideoSenderRef.current = null;
    audioSenderRef.current = null;
    pendingCandidatesRef.current.main = [];
    negotiationStateRef.current.main = { makingOffer: false, ignoreOffer: false };
    attachStream(localVideoRef, null);
    attachStream(remoteWebcamVideoRef, null);
    remoteCameraStreamRef.current = new MediaStream();
    setScreenSharing(false);
  }, [destroyScreenPeer]);

  const fetchRtcConfig = useCallback(async () => {
    try {
      const response = await api.get(API_ROUTES.webrtc.config);
      if (Array.isArray(response.data?.iceServers) && response.data.iceServers.length) rtcConfigRef.current = { iceServers: response.data.iceServers };
    } catch {}
  }, []);

  const startMainMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    cameraStreamRef.current = stream;
    attachStream(localVideoRef, stream);
    const peer = createPeer('main');
    const [videoTrack] = stream.getVideoTracks();
    const [audioTrack] = stream.getAudioTracks();
    if (videoTrack) cameraVideoSenderRef.current = peer.addTrack(videoTrack, stream);
    if (audioTrack) audioSenderRef.current = peer.addTrack(audioTrack, stream);
  }, [createPeer]);

  const fetchRoom = useCallback(async () => {
    setLoading(true);
    setRoomReady(false);
    try {
      const response = await api.get(roomDetailsRoute);
      const payload = response.data?.room || {};
      setRoom(payload);
      setRole(payload.role || user?.role || 'candidate');
      setCode(payload.codeState?.code || DEFAULT_CODE);
      setLanguage(payload.codeState?.language || 'javascript');
      setRemoteScreenSharing(Boolean(payload.mediaState?.candidateScreenSharing));
      setEditorLocked(Boolean(payload.controls?.editorLocked));
      setPaused(Boolean(payload.controls?.paused));
      setOutput((payload.executionHistory || []).slice(-1)[0]?.output || '');
      setRoomReady(true);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'You do not have access to this interview room.');
      setRoomReady(false);
    } finally {
      setLoading(false);
    }
  }, [roomDetailsRoute, user?.role]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setError('Please log in to join this interview room.');
      return;
    }
    void fetchRoom();
  }, [fetchRoom, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || loading || !roomReady) return undefined;
    const socket = connectSocket();
    socketRef.current = socket;
    void (async () => {
      try {
        await fetchRtcConfig();
        await startMainMedia();
      } catch (mediaError) {
        setError(`Media setup failed: ${mediaError.message}`);
        setMicEnabled(false);
        setCameraEnabled(false);
      }
    })();
    socket.emit('join_interview', { roomId });
    socket.on('interview_state', ({ room: nextRoom }) => {
      setRoom(nextRoom);
      setRole(nextRoom.role || user?.role || 'candidate');
      setEditorLocked(Boolean(nextRoom.controls?.editorLocked));
      setPaused(Boolean(nextRoom.controls?.paused));
      setRemoteScreenSharing(Boolean(nextRoom.mediaState?.candidateScreenSharing));
      setStatus('Joined');
    });
    socket.on('interview_peers', ({ peers }) => {
      if (peers?.length && mainPeerRef.current && mainPeerRef.current.signalingState === 'stable') {
        void mainPeerRef.current.setLocalDescription(mainPeerRef.current.createOffer()).then(() => emitDescription('main', mainPeerRef.current.localDescription));
      }
    });
    socket.on('webrtc_offer', async ({ offer, channel = 'main' }) => applyRemoteDescription(channel, offer).catch(() => {}));
    socket.on('webrtc_answer', async ({ answer, channel = 'main' }) => applyRemoteDescription(channel, answer).catch(() => {}));
    socket.on('webrtc_ice_candidate', async ({ candidate, channel = 'main' }) => addIceCandidate(channel, candidate).catch(() => {}));
    socket.on('code_update', ({ code: nextCode, language: nextLanguage, version }) => {
      if (version <= codeVersionRef.current) return;
      suppressEditorEventRef.current = true;
      codeVersionRef.current = version;
      setCode(nextCode);
      setLanguage(nextLanguage);
      requestAnimationFrame(() => { suppressEditorEventRef.current = false; });
    });
    socket.on('cursor_update', ({ cursor, role: cursorRole }) => setRemoteCursor({ ...cursor, role: cursorRole }));
    socket.on('language_update', ({ language: nextLanguage }) => setLanguage(nextLanguage));
    socket.on('execution_status', ({ status: nextStatus }) => setExecutionStatus(nextStatus));
    socket.on('execution_result', (result) => { setExecutionStatus(result.status || 'completed'); setOutput(`${result.success ? 'Success' : 'Failed'}\n\n${result.output || ''}${result.error ? `\n${result.error}` : ''}`); });
    socket.on('screen_share_started', () => setRemoteScreenSharing(true));
    socket.on('screen_share_stopped', () => { setRemoteScreenSharing(false); attachStream(remoteScreenVideoRef, null); });
    socket.on('screen_share_requested', ({ by }) => setMessages((items) => [...items, `${by} requested screen share.`].slice(-5)));
    socket.on('audio_toggled', ({ role: mediaRole, enabled }) => mediaRole === role && setMicEnabled(enabled));
    socket.on('video_toggled', ({ role: mediaRole, enabled }) => mediaRole === role && setCameraEnabled(enabled));
    socket.on('editor_lock_changed', ({ locked }) => setEditorLocked(locked));
    socket.on('interview_paused', ({ paused: nextPaused }) => setPaused(nextPaused));
    socket.on('prompt_received', ({ prompt: nextPrompt, by }) => setMessages((items) => [...items, `${by}: ${nextPrompt}`].slice(-5)));
    socket.on('interview_ended', () => {
      cleanupMedia();
      setStatus('Ended');
      navigate(isRecruiter ? '/recruiter/interviews' : '/candidate/dashboard');
    });
    socket.on('interview_error', ({ message }) => setError(message));
    const qualityInterval = setInterval(async () => {
      const peer = mainPeerRef.current;
      if (!peer) return;
      const stats = await peer.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && !report.isRemote) {
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
        }
      });
      const loss = packetsReceived ? packetsLost / packetsReceived : 0;
      setQuality(loss > 0.08 ? 'poor' : loss > 0.03 ? 'fair' : 'good');
    }, 5000);
    return () => {
      clearInterval(qualityInterval);
      socket.emit('leave_interview', { roomId });
      socket.off('interview_state');
      socket.off('interview_peers');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      cleanupMedia();
    };
  }, [addIceCandidate, applyRemoteDescription, cleanupMedia, emitDescription, fetchRtcConfig, isAuthenticated, isRecruiter, loading, navigate, role, roomId, roomReady, startMainMedia, user?.role]);

  const handleEditorChange = (value = '') => {
    if (suppressEditorEventRef.current || !canEdit) return;
    const version = codeVersionRef.current + 1;
    codeVersionRef.current = version;
    setCode(value);
    socketRef.current?.emit('code_change', { roomId, code: value, language, version });
  };
  const handleEditorMount = (editor) => editor.onDidChangeCursorPosition((event) => socketRef.current?.emit('cursor_change', { roomId, cursor: event.position }));
  const handleLanguageChange = (nextLanguage) => { setLanguage(nextLanguage); socketRef.current?.emit('language_change', { roomId, language: nextLanguage }); };
  const toggleMic = () => { const next = !micEnabled; cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next; }); setMicEnabled(next); socketRef.current?.emit('toggle_audio', { roomId, enabled: next }); };
  const toggleCamera = () => { const next = !cameraEnabled; cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; }); setCameraEnabled(next); socketRef.current?.emit('toggle_video', { roomId, enabled: next }); };
  const stopScreenShare = useCallback(async (fromBrowserStop = false) => {
    if (!screenStreamRef.current) return;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenSharing(false);
    destroyScreenPeer();
    socketRef.current?.emit('stop_screen_share', { roomId, fromBrowserStop });
  }, [destroyScreenPeer, roomId]);
  const startScreenShare = async () => {
    try {
      if (screenPeerRef.current) return;
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 24 }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const [screenTrack] = stream.getVideoTracks();
      if (!screenTrack) throw new Error('No screen track returned');
      const peer = createPeer('screen');
      screenSenderRef.current = peer.addTrack(screenTrack, stream);
      screenStreamRef.current = stream;
      screenTrack.onended = () => { void stopScreenShare(true); };
      setScreenSharing(true);
      socketRef.current?.emit('start_screen_share', { roomId });
    } catch (shareError) {
      setError(`Screen share failed: ${shareError.message}`);
    }
  };
  const runCode = () => { setExecutionStatus('running'); setOutput('Running...'); socketRef.current?.emit('run_code', { roomId, code, language }); };
  const recruiterAction = (event, payload = {}) => socketRef.current?.emit(event, { roomId, ...payload });
  const leaveRoom = () => { socketRef.current?.emit('leave_interview', { roomId }); cleanupMedia(); navigate(isRecruiter ? '/recruiter/interviews' : '/candidate/dashboard'); };

  if (loading) return <div className="min-h-screen bg-[#070A12] flex items-center justify-center text-sm text-slate-400">Preparing secure interview room...</div>;
  if (error && !room) return <div className="min-h-screen bg-[#070A12] flex items-center justify-center p-6"><div className="max-w-md w-full rounded-lg border border-red-500/20 bg-red-500/10 p-5 text-center"><div className="text-red-200 font-semibold">Unable to join room</div><p className="mt-2 text-sm text-red-100/80">{error}</p><Button className="mt-4" onClick={() => navigate('/login')}>Go to login</Button></div></div>;

  return (
    <div className="h-screen overflow-hidden bg-[#070A12] text-slate-100">
      <header className="h-14 border-b border-white/10 bg-[#0D1322] px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0"><div className="h-9 w-9 rounded-md bg-cyan-500/15 text-cyan-300 flex items-center justify-center"><Video size={18} /></div><div className="min-w-0"><div className="text-sm font-semibold truncate">{room?.job?.roleTitle || room?.problem?.title || 'Live Interview'}</div><div className="text-[11px] text-slate-400 flex items-center gap-2"><span className="capitalize">{role}</span><span>Room {roomId}</span><span className="flex items-center gap-1"><Radio size={11} /> {status} / {quality}</span>{remoteScreenSharing && <span className="text-emerald-300">Candidate is sharing screen</span>}</div></div></div>
        <div className="flex items-center gap-2">{isRecruiter && <><Button size="sm" variant="secondary" onClick={() => recruiterAction('request_screen_share')}>Request Share</Button><Button size="sm" variant="secondary" onClick={() => recruiterAction('lock_editor', { locked: !editorLocked })}>{editorLocked ? <Unlock size={14} /> : <Lock size={14} />}</Button><Button size="sm" variant="secondary" onClick={() => recruiterAction('pause_interview', { paused: !paused })}><Pause size={14} /></Button><Button size="sm" variant="danger" onClick={() => recruiterAction('end_interview')}>End</Button></>}<Button size="sm" variant="secondary" onClick={leaveRoom}><X size={14} /> Leave</Button></div>
      </header>
      {error && <div className="bg-red-500/15 border-b border-red-500/20 px-4 py-2 text-xs text-red-100">{error}</div>}
      {paused && <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-100">Interview is paused by recruiter.</div>}
      <main className="h-[calc(100vh-56px)] grid grid-cols-[280px_minmax(0,1fr)_320px] max-lg:grid-cols-1">
        <aside className="border-r border-white/10 bg-[#0A0F1C] p-4 overflow-y-auto max-lg:hidden"><div className="text-[11px] uppercase tracking-widest text-slate-500">Problem</div><h1 className="mt-3 text-xl font-semibold">{room?.problem?.title}</h1><div className="mt-2 text-xs text-cyan-300">{room?.problem?.difficulty || 'Medium'}</div><p className="mt-4 text-sm leading-6 text-slate-300 whitespace-pre-wrap">{room?.problem?.description}</p></aside>
        <section className="min-w-0 flex flex-col"><div className="h-11 border-b border-white/10 bg-[#101728] px-3 flex items-center justify-between"><div className="flex items-center gap-2"><select value={language} onChange={(event) => handleLanguageChange(event.target.value)} disabled={!canEdit} className="h-8 rounded-md border border-white/10 bg-[#080C16] px-2 text-xs outline-none">{LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{remoteCursor && <span className="text-[11px] text-slate-400">Remote cursor: L{remoteCursor.lineNumber}:C{remoteCursor.column}</span>}</div><Button size="sm" onClick={runCode} disabled={executionStatus === 'running'}><Play size={14} /> Run Code</Button></div><div className="flex-1 min-h-0 relative"><Editor height="100%" language={language === 'cpp' ? 'cpp' : language} theme="vs-dark" value={code} onChange={handleEditorChange} onMount={handleEditorMount} options={{ readOnly: !canEdit, minimap: { enabled: false }, fontSize: 14, lineHeight: 22, scrollBeyondLastLine: false, automaticLayout: true }} /></div><div className="h-40 border-t border-white/10 bg-[#050812]"><div className="h-9 px-3 border-b border-white/10 flex items-center gap-2 text-xs text-slate-300"><Terminal size={14} /> Shared execution output <span className="text-slate-500">({executionStatus})</span></div><pre className="h-[calc(100%-36px)] overflow-auto p-3 text-xs text-slate-300 whitespace-pre-wrap">{output || 'Run code to share stdout/stderr with both participants.'}</pre></div></section>
        <aside className="border-l border-white/10 bg-[#0A0F1C] flex flex-col min-h-0 max-lg:hidden">
          <div className="p-3 border-b border-white/10 space-y-3">
            <div className="relative aspect-video overflow-hidden rounded-md bg-black"><video ref={remoteWebcamVideoRef} autoPlay playsInline className="h-full w-full object-contain" /><div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[11px]">Remote webcam</div></div>
            <div className="relative aspect-video overflow-hidden rounded-md bg-black"><video ref={remoteScreenVideoRef} autoPlay playsInline className="h-full w-full object-contain" /><div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[11px]">Candidate screen</div></div>
            <div className="relative aspect-video overflow-hidden rounded-md bg-black"><video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />{!cameraEnabled && <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400"><CameraOff size={24} /></div>}<div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[11px]">You</div></div>
            <div className="grid grid-cols-4 gap-2"><button onClick={toggleMic} className={`h-10 rounded-md border flex items-center justify-center ${micEnabled ? 'border-white/10 bg-white/5' : 'border-red-500/30 bg-red-500/20 text-red-200'}`}>{micEnabled ? <Mic size={16} /> : <MicOff size={16} />}</button><button onClick={toggleCamera} className={`h-10 rounded-md border flex items-center justify-center ${cameraEnabled ? 'border-white/10 bg-white/5' : 'border-red-500/30 bg-red-500/20 text-red-200'}`}>{cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}</button><button disabled={isRecruiter} onClick={screenSharing ? stopScreenShare : startScreenShare} className={`h-10 rounded-md border flex items-center justify-center ${screenSharing ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/5 disabled:opacity-40'}`}>{screenSharing ? <ScreenShareOff size={16} /> : <MonitorUp size={16} />}</button><button onClick={leaveRoom} className="h-10 rounded-md border border-red-500/30 bg-red-500/20 text-red-100 flex items-center justify-center"><X size={16} /></button></div>
          </div>
          {isRecruiter && <div className="border-b border-white/10"><button onClick={() => setResumeOpen((open) => !open)} className="w-full h-10 px-3 flex items-center justify-between text-xs text-slate-300"><span className="flex items-center gap-2"><FileText size={14} /> Resume panel</span><ChevronRight size={14} className={resumeOpen ? 'rotate-90' : ''} /></button>{resumeOpen && <div className="max-h-64 overflow-y-auto px-3 pb-3 text-xs text-slate-300 space-y-3"><div><div className="font-semibold text-white">{candidate.name}</div><div className="text-slate-400">{candidate.email} {candidate.location ? ` / ${candidate.location}` : ''}</div></div><div><div className="text-slate-500 uppercase tracking-wider">AI insights</div><p className="mt-1 leading-5">{resume.aiAnalysis?.recruiterSummary || 'No parsed resume summary yet.'}</p></div></div>}</div>}
          <div className="flex-1 min-h-0 p-3 space-y-3 overflow-y-auto">{isRecruiter && <div className="space-y-2"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Send prompt or hint..." className="w-full h-20 resize-none rounded-md border border-white/10 bg-[#070A12] p-2 text-xs outline-none" /><Button size="sm" className="w-full" onClick={() => { recruiterAction('send_prompt', { prompt }); setPrompt(''); }}><Send size={14} /> Send Prompt</Button></div>}<div className="space-y-2 text-xs">{messages.map((item, index) => <div key={`${item}-${index}`} className="rounded-md border border-white/10 bg-white/[0.03] p-2 text-slate-300">{item}</div>)}</div></div>
        </aside>
      </main>
    </div>
  );
};

export default RoomPage;
