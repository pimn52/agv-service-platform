/**
 * 路线规划相关类型定义
 *
 * 路线规划用于巡游贩卖和安防巡检服务，
 * 支持任务停留点、非任务停留点、经过点和任务路段设置。
 */

// ─── 路线点位类型 ────────────────────────────

/** 点位类型 */
export type WaypointType = 'start' | 'end' | 'task_stop' | 'idle_stop' | 'pass_through';

/** 路线点位类型（RoutePoint 专用，与 WaypointType 保持一致） */
export type RoutePointType = WaypointType;

/** 停留方式 */
export type StopMode = 'timed';

/** 路线上的一个点位（起点/终点/停留点/经过点） */
export interface Waypoint {
  id: string;
  type: WaypointType;
  name: string;
  duration?: number;    // 停留时长（分钟），经过点/起点/终点可不填
  tasks?: string[];     // 关联的任务ID列表，经过点/起点/终点可不填
}

// ─── 任务路段 ────────────────────────────

/** 两个点位之间的路段，可绑定行驶途中执行的任务 */
export interface TaskSegment {
  id: string;
  fromWaypointId: string;
  toWaypointId: string;
  tasks: string[];      // 关联的任务ID列表
}

// ─── 任务项 ────────────────────────────

/** 任务可执行位置 */
export type TaskLocation = 'stop' | 'segment';

/** 可选任务项 */
export interface TaskItem {
  id: string;
  name: string;
  location: TaskLocation;
}

// ─── 路线规划 ────────────────────────────

/** 路线点（带位置信息） */
export interface RoutePoint {
  id: string;
  type: WaypointType;
  name: string;
  lat: number;
  lng: number;
  duration?: number;     // 停留时长（分钟），经过点/起点/终点可不填
  tasks?: string[];
}

/** 完整路线规划 */
export interface RoutePlan {
  id: string;
  orderId?: string;
  points: RoutePoint[];
  segments: TaskSegment[];
  totalDistance: number;  // km
  totalDuration: number;  // 分钟（含停留）
  drivingDuration: number; // 分钟（不含停留）
}

/** 路段任务（路段上执行的任务，从 TaskSegment 派生） */
export interface RouteTask {
  segmentId: string;
  fromName: string;
  toName: string;
  tasks: string[];
}

/** 路段任务别名 */
export type SegmentTask = RouteTask;
