'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import type { ServiceType } from '@/types';
import { RECOMMENDED_ROUTES } from '@/constants/services';
import type { RecommendedRoute } from '@/constants/services';
import {
  ArrowLeft,
  Plus,
  Trash2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Route,
  CheckSquare,
  Square,
  GripVertical,
  Save,
  MapPinned,
  Navigation,
} from 'lucide-react';

/* ────────────────────────── 类型定义 ────────────────────────── */

type WaypointType = 'start' | 'end' | 'task_stop' | 'non_task_stop' | 'waypoint';

interface TaskOption {
  id: string;
  name: string;
  forStop: boolean;    // 适用于停留点
  forSegment: boolean;  // 适用于路段
  serviceType: ServiceType;
}

interface Waypoint {
  id: string;
  type: WaypointType;
  name: string;
  duration: number;     // 停留时长（分钟），仅停留点
  tasks: string[];      // 选中的任务ID列表
}

interface SegmentTask {
  id: string;
  fromWaypointId: string;
  toWaypointId: string;
  tasks: string[];
}

/* ────────────────────────── 可用任务清单 ────────────────────────── */

const VENDING_TASKS: TaskOption[] = [
  { id: 'v-stop-1', name: '开放货架展示', forStop: true, forSegment: false, serviceType: 'vending' },
  { id: 'v-stop-2', name: '播放促销语音', forStop: true, forSegment: false, serviceType: 'vending' },
  { id: 'v-stop-3', name: '推送优惠通知', forStop: true, forSegment: false, serviceType: 'vending' },
  { id: 'v-stop-4', name: 'LED屏幕展示', forStop: true, forSegment: false, serviceType: 'vending' },
  { id: 'v-stop-5', name: '库存盘点', forStop: true, forSegment: false, serviceType: 'vending' },
  { id: 'v-seg-1', name: '循环播放广告', forStop: false, forSegment: true, serviceType: 'vending' },
  { id: 'v-seg-2', name: 'LED屏幕展示商品', forStop: false, forSegment: true, serviceType: 'vending' },
];

const SECURITY_TASKS: TaskOption[] = [
  { id: 's-stop-1', name: '360°全景拍照', forStop: true, forSegment: false, serviceType: 'security' },
  { id: 's-stop-2', name: '读取设备状态', forStop: true, forSegment: false, serviceType: 'security' },
  { id: 's-stop-3', name: '红外测温扫描', forStop: true, forSegment: false, serviceType: 'security' },
  { id: 's-stop-4', name: '播报安全提示', forStop: true, forSegment: false, serviceType: 'security' },
  { id: 's-stop-5', name: '对讲喊话', forStop: true, forSegment: false, serviceType: 'security' },
  { id: 's-seg-1', name: '摄像头持续录制', forStop: false, forSegment: true, serviceType: 'security' },
  { id: 's-seg-2', name: '异常行为检测', forStop: false, forSegment: true, serviceType: 'security' },
  { id: 's-seg-3', name: '语音播报巡检提示', forStop: false, forSegment: true, serviceType: 'security' },
];

/* ────────────────────────── 推荐路线条目组件 ────────────────────────── */

function RecommendedRouteItem({
  route,
  onApply,
}: {
  route: RecommendedRoute;
  onApply: () => void;
}) {
  return (
    <button
      onClick={onApply}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-[#EEEEEE] text-left hover:border-[#1677FF] hover:bg-[#E6F0FF]/30 transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-[#E6F0FF] flex items-center justify-center shrink-0">
        <Route className="w-4 h-4 text-[#1677FF]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#1A1A1A]">{route.name}</p>
        <p className="text-[10px] text-[#999999]">
          {route.stops}个停留点 · {route.duration} · {route.distance}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#1677FF] transition-colors shrink-0" />
    </button>
  );
}

/* ────────────────────────── 停留点组件 ────────────────────────── */

function WaypointItem({
  waypoint,
  taskOptions,
  onUpdate,
  onDelete,
}: {
  waypoint: Waypoint;
  taskOptions: TaskOption[];
  onUpdate: (id: string, updates: Partial<Waypoint>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(waypoint.type === 'task_stop');

  const isEditable = waypoint.type !== 'start' && waypoint.type !== 'end';
  const iconColor = waypoint.type === 'task_stop' ? '#1677FF' : waypoint.type === 'non_task_stop' ? '#999999' : '#52C41A';
  const icon = waypoint.type === 'task_stop' ? '⏱️' : waypoint.type === 'non_task_stop' ? '○' : waypoint.type === 'waypoint' ? '🔵' : waypoint.type === 'start' ? '📍' : '🏁';
  const label = waypoint.type === 'task_stop' ? '任务停留点' : waypoint.type === 'non_task_stop' ? '非任务停留点' : waypoint.type === 'waypoint' ? '经过点' : waypoint.type === 'start' ? '起点' : '终点';

  const stopTasks = taskOptions.filter((t) => t.forStop);

  return (
    <div className="bg-white rounded-lg border border-[#EEEEEE] overflow-hidden">
      <button
        onClick={() => isEditable && setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-[14px]">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-[#1A1A1A] truncate">
              {waypoint.name || label}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${iconColor}15`, color: iconColor }}>
              {label}
            </span>
          </div>
          {(waypoint.type === 'task_stop' || waypoint.type === 'non_task_stop') && waypoint.duration > 0 && (
            <p className="text-[10px] text-[#999999]">停留 {waypoint.duration} 分钟</p>
          )}
        </div>
        {isEditable && (expanded ? <ChevronUp className="w-4 h-4 text-[#999999]" /> : <ChevronDown className="w-4 h-4 text-[#999999]" />)}
      </button>

      {expanded && isEditable && (
        <div className="px-3 pb-3 border-t border-[#F0F0F0]">
          {/* 名称输入 */}
          <div className="mt-2">
            <input
              type="text"
              placeholder="输入地点名称"
              value={waypoint.name}
              onChange={(e) => onUpdate(waypoint.id, { name: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
            />
          </div>

          {/* 停留时长 */}
          {(waypoint.type === 'task_stop' || waypoint.type === 'non_task_stop') && (
            <div className="mt-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#999999] shrink-0" />
              <span className="text-[11px] text-[#666666] shrink-0">停留时长</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdate(waypoint.id, { duration: Math.max(0, waypoint.duration - 5) })}
                  className="w-6 h-6 flex items-center justify-center bg-[#F5F6FA] rounded text-[12px] text-[#666666] hover:bg-[#E0E0E0]"
                >
                  -
                </button>
                <span className="text-[12px] text-[#1A1A1A] w-8 text-center">{waypoint.duration}</span>
                <button
                  onClick={() => onUpdate(waypoint.id, { duration: waypoint.duration + 5 })}
                  className="w-6 h-6 flex items-center justify-center bg-[#F5F6FA] rounded text-[12px] text-[#666666] hover:bg-[#E0E0E0]"
                >
                  +
                </button>
                <span className="text-[10px] text-[#999999]">分钟</span>
              </div>
            </div>
          )}

          {/* 任务选择（仅任务停留点） */}
          {waypoint.type === 'task_stop' && (
            <div className="mt-2">
              <p className="text-[11px] text-[#666666] mb-1">执行任务</p>
              <div className="space-y-1">
                {stopTasks.map((task) => {
                  const checked = waypoint.tasks.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        const newTasks = checked
                          ? waypoint.tasks.filter((t) => t !== task.id)
                          : [...waypoint.tasks, task.id];
                        onUpdate(waypoint.id, { tasks: newTasks });
                      }}
                      className="w-full flex items-center gap-2 py-1 text-left"
                    >
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#1677FF] shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#CCCCCC] shrink-0" />
                      )}
                      <span className={`text-[11px] ${checked ? 'text-[#1A1A1A]' : 'text-[#999999]'}`}>
                        {task.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 删除按钮 */}
          <button
            onClick={() => onDelete(waypoint.id)}
            className="mt-2 flex items-center gap-1 text-[11px] text-[#FF4D4F] hover:underline"
          >
            <Trash2 className="w-3 h-3" />
            删除此点
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── 路段任务组件 ────────────────────────── */

function SegmentTaskItem({
  segment,
  waypoints,
  taskOptions,
  onUpdate,
  onDelete,
}: {
  segment: SegmentTask;
  waypoints: Waypoint[];
  taskOptions: TaskOption[];
  onUpdate: (id: string, updates: Partial<SegmentTask>) => void;
  onDelete: (id: string) => void;
}) {
  const segTasks = taskOptions.filter((t) => t.forSegment);
  const fromWp = waypoints.find((w) => w.id === segment.fromWaypointId);
  const toWp = waypoints.find((w) => w.id === segment.toWaypointId);

  return (
    <div className="bg-white rounded-lg border border-[#EEEEEE] p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[#666666]">
          🛣️ {fromWp?.name || '起点'} → {toWp?.name || '终点'}
        </span>
        <button onClick={() => onDelete(segment.id)} className="text-[#FF4D4F] hover:underline text-[10px]">
          删除
        </button>
      </div>
      <div className="space-y-1">
        {segTasks.map((task) => {
          const checked = segment.tasks.includes(task.id);
          return (
            <button
              key={task.id}
              onClick={() => {
                const newTasks = checked
                  ? segment.tasks.filter((t) => t !== task.id)
                  : [...segment.tasks, task.id];
                onUpdate(segment.id, { tasks: newTasks });
              }}
              className="w-full flex items-center gap-2 py-0.5 text-left"
            >
              {checked ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#1677FF] shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#CCCCCC] shrink-0" />
              )}
              <span className={`text-[11px] ${checked ? 'text-[#1A1A1A]' : 'text-[#999999]'}`}>
                {task.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function RoutePlanningPage({ page }: { page: SubPage }) {
  const { popPage } = useAppStore();
  const pageData = (page as { key: string; data?: { orderId?: string; serviceType?: ServiceType } }).data;
  const serviceType = pageData?.serviceType ?? 'vending';

  const taskOptions = serviceType === 'vending' ? VENDING_TASKS : SECURITY_TASKS;

  // 路线点位列表
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: 'wp-start', type: 'start', name: '当前位置', duration: 0, tasks: [] },
    { id: 'wp-end', type: 'end', name: '返回起点', duration: 0, tasks: [] },
  ]);

  // 路段任务列表
  const [segmentTasks, setSegmentTasks] = useState<SegmentTask[]>([]);

  const updateWaypoint = useCallback((id: string, updates: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }, []);

  const deleteWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    // 也删除关联的路段任务
    setSegmentTasks((prev) => prev.filter((s) => s.fromWaypointId !== id && s.toWaypointId !== id));
  }, []);

  const addWaypoint = useCallback((type: WaypointType) => {
    const id = `wp-${Date.now()}`;
    const newWp: Waypoint = {
      id,
      type,
      name: '',
      duration: type === 'task_stop' ? 30 : type === 'non_task_stop' ? 15 : 0,
      tasks: [],
    };
    // 插入到终点之前
    setWaypoints((prev) => {
      const endIdx = prev.findIndex((w) => w.type === 'end');
      const newWps = [...prev];
      newWps.splice(endIdx, 0, newWp);
      return newWps;
    });
  }, []);

  const addSegmentTask = useCallback(() => {
    // 在相邻点位之间添加路段任务
    const editableWps = waypoints.filter((w) => w.type !== 'start' && w.type !== 'end');
    if (editableWps.length < 1) return;
    const newSeg: SegmentTask = {
      id: `seg-${Date.now()}`,
      fromWaypointId: waypoints[0]?.id ?? '',
      toWaypointId: waypoints[1]?.id ?? '',
      tasks: [],
    };
    setSegmentTasks((prev) => [...prev, newSeg]);
  }, [waypoints]);

  const updateSegmentTask = useCallback((id: string, updates: Partial<SegmentTask>) => {
    setSegmentTasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteSegmentTask = useCallback((id: string) => {
    setSegmentTasks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // 应用推荐路线
  const applyRecommendedRoute = useCallback((route: RecommendedRoute) => {
    const newWaypoints: Waypoint[] = [
      { id: 'wp-start', type: 'start', name: '当前位置', duration: 0, tasks: [] },
    ];
    route.waypoints.forEach((wp, idx) => {
      newWaypoints.push({
        id: `wp-rec-${idx}`,
        type: 'task_stop' as WaypointType,
        name: wp.name,
        duration: wp.duration,
        tasks: [],
      });
    });
    newWaypoints.push({ id: 'wp-end', type: 'end', name: '返回起点', duration: 0, tasks: [] });
    setWaypoints(newWaypoints);
    setSegmentTasks([]);
  }, []);

  // 统计路线概览
  const taskStops = waypoints.filter((w) => w.type === 'task_stop');
  const nonTaskStops = waypoints.filter((w) => w.type === 'non_task_stop');
  const passPoints = waypoints.filter((w) => w.type === 'waypoint');
  const totalStopDuration = waypoints.reduce((sum, w) => sum + w.duration, 0);

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* 顶部导航：返回按钮 + 标题 + 保存草稿 */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
          <button
            onClick={() => useAppStore.getState().popPage()}
            className="flex items-center gap-1 text-[#1677FF] active:opacity-60 transition-opacity justify-self-start"
          >
            <ArrowLeft size={18} />
            <span className="text-[13px]">返回</span>
          </button>
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">路线规划</h1>
          <button className="flex items-center gap-1 text-[13px] text-[#1677FF] hover:underline justify-self-end">
            <Save className="w-3.5 h-3.5" />
            保存草稿
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* 地图区域 */}
        <div className="px-4 pt-3">
          <div className="bg-[#E8ECF0] rounded-xl h-[140px] flex items-center justify-center relative">
            <div className="text-center">
              <MapPinned className="w-7 h-7 mx-auto text-[#999999] mb-1" />
              <p className="text-[11px] text-[#999999]">区域地图（MVP模拟）</p>
              <p className="text-[9px] text-[#CCCCCC]">标注起点、停留点、经过点、终点</p>
            </div>
          </div>
        </div>

        {/* 推荐路线 */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FAAD14]" />
              <span className="text-[13px] font-medium text-[#1A1A1A]">推荐路线</span>
              <span className="text-[10px] text-[#999999]">一键套用</span>
            </div>
            <div className="space-y-2">
              {RECOMMENDED_ROUTES.filter((r) => r.serviceType === serviceType).map((route) => (
                <RecommendedRouteItem
                  key={route.id}
                  route={route}
                  onApply={() => applyRecommendedRoute(route)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 点位列表 */}
        <div className="px-4 mt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Navigation className="w-3.5 h-3.5 text-[#1677FF]" />
            <span className="text-[13px] font-medium text-[#1A1A1A]">路线点位</span>
          </div>
          <div className="space-y-2">
            {waypoints.map((wp) => (
              <WaypointItem
                key={wp.id}
                waypoint={wp}
                taskOptions={taskOptions}
                onUpdate={updateWaypoint}
                onDelete={deleteWaypoint}
              />
            ))}
          </div>

          {/* 添加点位按钮 */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => addWaypoint('task_stop')}
              className="flex-1 py-2 rounded-lg border border-dashed border-[#1677FF] text-[11px] text-[#1677FF] flex items-center justify-center gap-1 hover:bg-[#E6F0FF] transition-colors"
            >
              <Plus className="w-3 h-3" />
              任务停留点
            </button>
            <button
              onClick={() => addWaypoint('non_task_stop')}
              className="flex-1 py-2 rounded-lg border border-dashed border-[#999999] text-[11px] text-[#999999] flex items-center justify-center gap-1 hover:bg-[#F5F6FA] transition-colors"
            >
              <Plus className="w-3 h-3" />
              非任务停留
            </button>
            <button
              onClick={() => addWaypoint('waypoint')}
              className="flex-1 py-2 rounded-lg border border-dashed border-[#52C41A] text-[11px] text-[#52C41A] flex items-center justify-center gap-1 hover:bg-[#F6FFED] transition-colors"
            >
              <Plus className="w-3 h-3" />
              经过点
            </button>
          </div>
        </div>

        {/* 路段任务 */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="text-[13px] font-medium text-[#1A1A1A]">路段任务</span>
            </div>
            <button
              onClick={addSegmentTask}
              className="text-[11px] text-[#1677FF] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
          {segmentTasks.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#EEEEEE] p-3 text-center">
              <p className="text-[11px] text-[#999999]">暂无路段任务，点击上方添加</p>
            </div>
          ) : (
            <div className="space-y-2">
              {segmentTasks.map((seg) => (
                <SegmentTaskItem
                  key={seg.id}
                  segment={seg}
                  waypoints={waypoints}
                  taskOptions={taskOptions}
                  onUpdate={updateSegmentTask}
                  onDelete={deleteSegmentTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* 路线概览 */}
        <div className="px-4 mt-4 pb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="text-[13px] font-medium text-[#1A1A1A]">路线概览</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-[#F5F6FA] rounded-lg">
                <p className="text-[10px] text-[#999999]">总距离</p>
                <p className="text-[14px] font-medium text-[#1A1A1A]">18.5<span className="text-[10px] text-[#999999] ml-0.5">km</span></p>
              </div>
              <div className="p-2 bg-[#F5F6FA] rounded-lg">
                <p className="text-[10px] text-[#999999]">行驶时长</p>
                <p className="text-[14px] font-medium text-[#1A1A1A]">约40<span className="text-[10px] text-[#999999] ml-0.5">分钟</span></p>
              </div>
              <div className="p-2 bg-[#F5F6FA] rounded-lg">
                <p className="text-[10px] text-[#999999]">停留时长</p>
                <p className="text-[14px] font-medium text-[#1A1A1A]">约{totalStopDuration}<span className="text-[10px] text-[#999999] ml-0.5">分钟</span></p>
              </div>
              <div className="p-2 bg-[#F5F6FA] rounded-lg">
                <p className="text-[10px] text-[#999999]">总时长</p>
                <p className="text-[14px] font-medium text-[#1A1A1A]">约{Math.ceil((40 + totalStopDuration) / 60 * 10) / 10}<span className="text-[10px] text-[#999999] ml-0.5">小时</span></p>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <span className="text-[10px] text-[#999999]">
                任务停留 <span className="text-[#1677FF] font-medium">{taskStops.length}</span> 个
              </span>
              <span className="text-[10px] text-[#999999]">
                非任务停留 <span className="text-[#666666] font-medium">{nonTaskStops.length}</span> 个
              </span>
              <span className="text-[10px] text-[#999999]">
                经过点 <span className="text-[#52C41A] font-medium">{passPoints.length}</span> 个
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部确认按钮 */}
      <div className="bg-white border-t border-[#EEEEEE] px-4 py-3">
        <button
          onClick={() => popPage()}
          className="w-full py-2.5 bg-[#1677FF] text-white rounded-xl text-[14px] font-medium hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors"
        >
          确认路线
        </button>
      </div>
    </div>
  );
}
