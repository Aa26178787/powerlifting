// 역할 -> 슬롯 타입. heavy = 컴페티션 동작; 그 외 = 변형 슬롯.
export function slotTypeForRole(role) {
  return role === 'heavy' ? 'comp' : 'variation'
}
