import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Cpu, Zap, Box, Code2, Link, Database, RefreshCcw, Table, PlusSquare } from 'lucide-react';
import { McpService, McpTool, McpResource } from '../services/mcpService';

const McpConsole: React.FC = () => {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [rpcLogs, setRpcLogs] = useState<{method: string, direction: 'in' | 'out', data: any, time: string}[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'traffic' | 'resources' | 'tools'>('traffic');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const toolList = await McpService.listTools();
      const resList = await McpService.listResources();
      setTools(toolList);
      setResources(resList);
      const ctx = await McpService.getSystemContext();
      setStatus(ctx);
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rpcLogs]);

  const addRpcLog = (method: string, direction: 'in' | 'out', data: any) => {
    setRpcLogs(prev => [...prev, {
      method,
      direction,
      data,
      time: new Date().toLocaleTimeString()
    }].slice(-20));
  };

  const simulateRpcCall = async (method: string, params: any) => {
    addRpcLog(method, 'in', params);
    try {
      const result = await McpService.handleRequest(method, params);
      addRpcLog(method, 'out', result);
    } catch (e: any) {
      addRpcLog(method, 'out', { error: e.message });
    }
  };

  const simulateCreateTable = () => {
    simulateRpcCall('tools/call', {
      name: 'create_table',
      arguments: {
        table_name: 'mcp_provisioned_logs',
        columns: [
          { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()' },
          { name: 'log_level', type: 'TEXT', constraints: 'NOT NULL' },
          { name: 'message', type: 'TEXT', constraints: 'NOT NULL' },
          { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT now()' }
        ]
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-supabase-bg font-sans animate-in fade-in duration-500">
      {/* Protocol Header */}
      <div className="h-16 border-b border-supabase-border bg-supabase-panel flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-supabase-green/10 rounded-xl text-supabase-green border border-supabase-green/20 shadow-inner">
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="text-sm font-black text-supabase-text uppercase tracking-[0.2em] leading-none">MCP Protocol Node</h1>
            <p className="text-[10px] text-supabase-muted font-mono tracking-tighter mt-1">TRANSPORT: browser.stdio // STATUS: LISTENING</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-supabase-muted uppercase font-black tracking-widest mb-0.5">Protocol Sync</span>
                <span className="text-xs text-supabase-green flex items-center gap-1.5 font-mono font-black">
                    <Zap size={10} className="animate-pulse" /> {status?.latency || 0}ms Latency
                </span>
            </div>
            <div className="w-px h-8 bg-supabase-border"></div>
            <div className="flex items-center gap-3 bg-supabase-sidebar px-4 py-1.5 rounded-lg border border-supabase-border shadow-inner">
                <div className="w-2 h-2 rounded-full bg-supabase-green shadow-[0_0_8px_#3ecf8e]" />
                <span className="text-[10px] font-black text-supabase-text uppercase tracking-widest">Active</span>
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav (Discovery) */}
        <div className="w-72 border-r border-supabase-border bg-supabase-sidebar flex flex-col shadow-2xl z-0">
            <div className="p-5 flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab('traffic')}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all group ${activeTab === 'traffic' ? 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20 shadow-sm' : 'text-supabase-muted hover:bg-supabase-hover border border-transparent'}`}
                >
                    <div className="flex items-center gap-3">
                        <Terminal size={14} className={activeTab === 'traffic' ? 'text-supabase-green' : 'text-supabase-muted'} />
                        <span>Traffic Stream</span>
                    </div>
                    {activeTab === 'traffic' && <div className="w-1.5 h-1.5 rounded-full bg-supabase-green animate-ping" />}
                </button>
                <button 
                  onClick={() => setActiveTab('resources')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'resources' ? 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20 shadow-sm' : 'text-supabase-muted hover:bg-supabase-hover border border-transparent'}`}
                >
                    <Box size={14} /> Resources
                </button>
                <button 
                  onClick={() => setActiveTab('tools')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeTab === 'tools' ? 'bg-supabase-green/10 text-supabase-green border border-supabase-green/20 shadow-sm' : 'text-supabase-muted hover:bg-supabase-hover border border-transparent'}`}
                >
                    <RefreshCcw size={14} /> Capability Tools
                </button>
            </div>

            <div className="mt-4 px-8">
                <h3 className="text-[9px] font-black text-supabase-muted uppercase tracking-[0.3em] mb-6 border-b border-supabase-border/50 pb-2">Schema Capabilities</h3>
                <div className="space-y-4">
                    {[
                        { label: 'Resource Read', enabled: true },
                        { label: 'Table Provision', enabled: true },
                        { label: 'Tool Execution', enabled: true },
                        { label: 'Logging Stream', enabled: true },
                        { label: 'Sampling (AI)', enabled: false },
                    ].map(cap => (
                        <div key={cap.label} className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-supabase-text/70 uppercase tracking-tighter">{cap.label}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${cap.enabled ? 'bg-supabase-green shadow-[0_0_5px_#3ecf8e]' : 'bg-supabase-border shadow-inner opacity-30'}`}></div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-auto p-6 bg-supabase-bg/40 border-t border-supabase-border">
                <div className="text-[8px] font-black text-supabase-muted uppercase tracking-widest mb-3">Linked Cluster</div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-supabase-panel border border-supabase-border">
                    <Database size={14} className="text-supabase-green shrink-0" />
                    <span className="text-[10px] font-mono text-supabase-text truncate tracking-tight opacity-80">unacademy-core-replica</span>
                </div>
            </div>
        </div>

        {/* Main Console Area */}
        <div className="flex-1 bg-supabase-bg flex flex-col min-w-0">
          {activeTab === 'traffic' && (
            <div className="flex-1 flex flex-col p-8 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex-1 bg-supabase-panel border border-supabase-border rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/5">
                    <div className="px-5 py-3 border-b border-supabase-border bg-supabase-sidebar flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-supabase-text uppercase tracking-[0.2em]">Live RPC Stream</span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase">v2.0</span>
                        </div>
                        <button onClick={() => setRpcLogs([])} className="text-[9px] font-black text-supabase-muted hover:text-supabase-text uppercase tracking-widest transition-colors">Flush Buffer</button>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-4 custom-scrollbar bg-supabase-bg/20">
                        {rpcLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-supabase-muted opacity-30 space-y-4">
                                <RefreshCcw size={32} className="animate-spin-slow" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting protocol handshake...</span>
                            </div>
                        )}
                        {rpcLogs.map((log, i) => (
                            <div key={i} className={`p-4 rounded-xl border transition-all ${log.direction === 'in' ? 'bg-supabase-sidebar border-supabase-border shadow-inner' : 'bg-supabase-green/[0.03] border-supabase-green/20'}`}>
                                <div className="flex items-center gap-3 mb-3 border-b border-supabase-border/30 pb-2">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${log.direction === 'in' ? 'bg-blue-500 text-black' : 'bg-supabase-green text-black'}`}>
                                        {log.direction === 'in' ? 'INCOMING_REQ' : 'RESPONSE_READY'}
                                    </span>
                                    <span className="text-[9px] text-supabase-muted font-bold">{log.time}</span>
                                    <span className="text-[10px] text-supabase-text font-black ml-auto uppercase tracking-tighter opacity-60">METHOD: {log.method}</span>
                                </div>
                                <pre className="whitespace-pre-wrap break-all text-supabase-muted leading-relaxed font-mono text-[11px]">{JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="mt-6 flex flex-wrap gap-4">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button onClick={() => simulateRpcCall('resources/list', {})} className="py-3 bg-supabase-panel border border-supabase-border rounded-xl text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green/50 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <Link size={12} /> List All
                        </button>
                        <button onClick={() => simulateRpcCall('tools/list', {})} className="py-3 bg-supabase-panel border border-supabase-border rounded-xl text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green/50 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <Code2 size={12} /> Capabilities
                        </button>
                        <button onClick={() => simulateRpcCall('resources/read', { uri: 'supabase://tables/employees/directory' })} className="py-3 bg-supabase-panel border border-supabase-border rounded-xl text-[9px] font-black uppercase tracking-widest text-supabase-muted hover:text-supabase-green hover:border-supabase-green/50 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <Database size={12} /> Sync Directory
                        </button>
                        <button 
                            onClick={simulateCreateTable} 
                            className="py-3 bg-supabase-green text-black rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-supabase-greenHover transition-all flex items-center justify-center gap-2 shadow-lg shadow-supabase-green/10 ring-1 ring-white/10"
                        >
                            <Table size={12} /> Create MCP Table
                        </button>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="flex-1 p-10 space-y-8 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {resources.map(res => (
                        <div key={res.uri} className="bg-supabase-panel border border-supabase-border rounded-2xl p-8 shadow-lg hover:border-supabase-green/30 transition-all group relative overflow-hidden ring-1 ring-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-supabase-green/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-supabase-green/10 transition-all"></div>
                            <div className="flex items-center gap-5 mb-6 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-supabase-bg border border-supabase-border flex items-center justify-center text-supabase-green group-hover:scale-110 transition-transform shadow-inner">
                                    <Link size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-supabase-text uppercase tracking-tight">{res.name}</h4>
                                    <span className="text-[9px] text-supabase-muted font-mono uppercase tracking-tighter opacity-60">{res.uri}</span>
                                </div>
                            </div>
                            <p className="text-xs text-supabase-muted leading-relaxed mb-6 h-12 line-clamp-3 relative z-10">{res.description}</p>
                            <div className="flex items-center justify-between pt-6 border-t border-supabase-border/50 relative z-10">
                                <span className="text-[9px] font-black font-mono text-supabase-muted uppercase tracking-widest bg-supabase-sidebar px-2 py-0.5 rounded border border-supabase-border">{res.mimeType}</span>
                                <button 
                                    onClick={() => simulateRpcCall('resources/read', { uri: res.uri })}
                                    className="text-[9px] font-black text-supabase-green uppercase tracking-[0.2em] hover:underline"
                                >
                                    FETCH PAYLOAD
                                </button>
                            </div>
                        </div>
                    ))}
                    <div className="bg-supabase-sidebar border border-supabase-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-50 group hover:opacity-100 transition-all cursor-pointer">
                        <PlusSquare size={32} className="text-supabase-muted mb-4 group-hover:text-supabase-green transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Expose New Resource</span>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'tools' && (
             <div className="flex-1 p-10 space-y-6 overflow-y-auto animate-in zoom-in-95 duration-300">
                <div className="grid grid-cols-1 gap-6">
                    {tools.map(tool => (
                        <div key={tool.name} className="bg-supabase-panel border border-supabase-border rounded-2xl p-8 shadow-xl ring-1 ring-white/5 hover:border-supabase-green/20 transition-all group">
                            <div className="flex items-center justify-between mb-6 border-b border-supabase-border/40 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-supabase-bg border border-supabase-border flex items-center justify-center text-supabase-green shadow-inner">
                                        <Code2 size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-supabase-green font-mono uppercase tracking-[0.2em]">{tool.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-supabase-green" />
                                            <span className="text-[8px] font-black text-supabase-muted uppercase tracking-widest">Schema Verified</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => simulateRpcCall('tools/call', { name: tool.name, arguments: {} })}
                                    className="p-3 bg-supabase-green/10 text-supabase-green border border-supabase-green/30 rounded-xl hover:bg-supabase-green hover:text-black transition-all group-hover:scale-110 shadow-lg shadow-supabase-green/5"
                                >
                                    <Play size={18} fill="currentColor" />
                                </button>
                            </div>
                            <p className="text-sm text-supabase-muted mb-8 leading-relaxed max-w-2xl">{tool.description}</p>
                            <div className="bg-supabase-sidebar rounded-2xl p-6 border border-supabase-border shadow-inner">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-black text-supabase-muted uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Terminal size={12} /> JSON Schema Definitions
                                    </span>
                                    <span className="text-[8px] text-supabase-muted font-mono opacity-40">mcp-v1.0.4</span>
                                </div>
                                <pre className="text-[11px] font-mono text-supabase-text/70 whitespace-pre-wrap leading-relaxed">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default McpConsole;