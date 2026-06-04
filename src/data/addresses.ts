export interface AddressEntry {
  id: string;
  label: string;
  address: string;
  name: string;
  phone: string;
}

export const DELIVERY_ADDRESS_BOOK: AddressEntry[] = [
  { id: 'a1', label: '望京仓储中心', address: '北京市朝阳区望京西路18号', name: '张经理', phone: '13800001111' },
  { id: 'a2', label: '中关村配送站', address: '北京市海淀区中关村软件园二期A座', name: '李主管', phone: '13800002222' },
  { id: 'a3', label: '国贸前置仓', address: '北京市朝阳区国贸大厦B1层', name: '王主任', phone: '13800003333' },
  { id: 'a4', label: '亦庄集散中心', address: '北京市大兴区亦庄经济开发区荣华南路10号', name: '赵经理', phone: '13800004444' },
];

export const CRUISE_ADDRESS_BOOK: AddressEntry[] = [
  { id: 'a1', label: '三里屯商圈', address: '北京市朝阳区三里屯太古里南区', name: '陈运营', phone: '13900001111' },
  { id: 'a2', label: '五道口大学区', address: '北京市海淀区五道口华联购物中心', name: '刘经理', phone: '13900002222' },
  { id: 'a3', label: '西单商业街', address: '北京市西城区西单北大街120号', name: '周主管', phone: '13900003333' },
  { id: 'a4', label: '望京科技园', address: '北京市朝阳区望京SOHO T1', name: '吴主任', phone: '13900004444' },
];