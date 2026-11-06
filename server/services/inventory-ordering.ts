import { storage } from '../storage';
import type { OrderingProduct, StockCount } from '@shared/schema';

export interface OrderCalculation {
  productId: string;
  productName: string;
  targetQty: number;
  actualQty: number;
  orderQty: number;
  supplier: string;
  supplierId: string;
  orderingStrategy: string;
  product: OrderingProduct;
  latestCount: StockCount | null;
}

export async function calculateOrderQuantities(locationCode: string = 'HEAD_OFFICE'): Promise<OrderCalculation[]> {
  const productsBelowTarget = await storage.getProductsBelowTarget(locationCode);
  
  const results: OrderCalculation[] = [];
  
  for (const item of productsBelowTarget) {
    const { product, latestCount, targetQuantity, actualQuantity, orderQuantity } = item;
    
    // Get supplier info
    const supplier = product.supplierId ? await storage.getSupplier(product.supplierId) : null;
    
    results.push({
      productId: product.id,
      productName: product.name,
      targetQty: targetQuantity,
      actualQty: actualQuantity,
      orderQty: orderQuantity,
      supplier: supplier?.name || 'Unknown Supplier',
      supplierId: product.supplierId || '',
      orderingStrategy: product.orderingStrategy || 'manual_sms',
      product,
      latestCount
    });
  }
  
  return results;
}

export function groupOrdersBySupplier(orders: OrderCalculation[]): Map<string, OrderCalculation[]> {
  const grouped = new Map<string, OrderCalculation[]>();
  
  for (const order of orders) {
    const supplierId = order.supplierId;
    if (!grouped.has(supplierId)) {
      grouped.set(supplierId, []);
    }
    grouped.get(supplierId)!.push(order);
  }
  
  return grouped;
}

export function groupOrdersByStrategy(orders: OrderCalculation[]): {
  autoEmail: OrderCalculation[];
  manualSms: OrderCalculation[];
} {
  const autoEmail: OrderCalculation[] = [];
  const manualSms: OrderCalculation[] = [];
  
  for (const order of orders) {
    if (order.orderingStrategy === 'auto_email') {
      autoEmail.push(order);
    } else {
      manualSms.push(order);
    }
  }
  
  return { autoEmail, manualSms };
}
