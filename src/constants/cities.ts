export interface City {
  code: string;
  name: string;
  province: string;
  available: boolean;  // 是否已开通服务
}

export const CITIES: City[] = [
  { code: '110000', name: '北京', province: '北京市', available: true },
  { code: '310000', name: '上海', province: '上海市', available: true },
  { code: '440100', name: '广州', province: '广东省', available: true },
  { code: '440300', name: '深圳', province: '广东省', available: true },
  { code: '330100', name: '杭州', province: '浙江省', available: true },
  { code: '320100', name: '南京', province: '江苏省', available: true },
  { code: '510100', name: '成都', province: '四川省', available: false },
  { code: '420100', name: '武汉', province: '湖北省', available: false },
  { code: '500100', name: '重庆', province: '重庆市', available: false },
  { code: '610100', name: '西安', province: '陕西省', available: false },
];

export const DEFAULT_CITY: City = CITIES[0];
