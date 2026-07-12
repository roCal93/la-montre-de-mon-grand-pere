const ORDER_CONTENT_MANAGER_PATH = '/content-manager/collection-types/api::order.order/'

const ORDER_STATUS_MAP: Record<string, string> = {
  pending: 'commande_confirmee',
  paid: 'commande_confirmee',
  shipped: 'commande_expediee',
  cancelled: 'commande_terminee',
  refunded: 'commande_terminee',
  commande_confirmee: 'commande_confirmee',
  'commande confirmee': 'commande_confirmee',
  'commande confirmée': 'commande_confirmee',
  'commande confirme': 'commande_confirmee',
  en_preparation: 'en_preparation',
  'en preparation': 'en_preparation',
  'en préparation': 'en_preparation',
  commande_expediee: 'commande_expediee',
  'commande expediee': 'commande_expediee',
  'commande expédiée': 'commande_expediee',
  commande_terminee: 'commande_terminee',
  'commande terminee': 'commande_terminee',
  'commande terminée': 'commande_terminee',
}

const normalizeStatusKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-]+/g, ' ')
    .replace(/[_]+/g, '_')
    .replace(/\s+/g, ' ')

const mapOrderStatus = (value: unknown) => {
  if (typeof value !== 'string') {
    return value
  }

  const normalizedKey = normalizeStatusKey(value)
  return ORDER_STATUS_MAP[normalizedKey] ?? value
}

const normalizeBodyStatus = (body: Record<string, unknown>) => {
  if (typeof body.status === 'string') {
    body.status = mapOrderStatus(body.status)
  }

  const data = body.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const typedData = data as Record<string, unknown>
    if (typeof typedData.status === 'string') {
      typedData.status = mapOrderStatus(typedData.status)
    }
  }
}

export default () => {
  return async (ctx: any, next: () => Promise<any>) => {
    const method = String(ctx.request.method || '').toUpperCase()
    const path = String(ctx.request.path || '')

    if (
      (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
      path.startsWith(ORDER_CONTENT_MANAGER_PATH) &&
      ctx.request.body &&
      typeof ctx.request.body === 'object' &&
      !Array.isArray(ctx.request.body)
    ) {
      normalizeBodyStatus(ctx.request.body as Record<string, unknown>)
    }

    await next()
  }
}