import { sendGenericEmail } from '../email';
import { sendSMS } from '../justcall';
import { storage } from '../storage';
import type { OrderCalculation } from './inventory-ordering';
import { format } from 'date-fns';

export interface EmailOrderResult {
  success: boolean;
  supplier: string;
  itemCount: number;
  error?: string;
  orderId?: string;
}

export interface SMSOrderResult {
  success: boolean;
  itemCount: number;
  error?: string;
  orderIds?: string[];
}

export async function sendImperialLaundryEmail(items: OrderCalculation[]): Promise<EmailOrderResult> {
  try {
    // Get supplier info
    const supplier = items.length > 0 ? await storage.getSupplier(items[0].supplierId) : null;
    
    if (!supplier || !supplier.email) {
      return {
        success: false,
        supplier: 'Imperial Laundry',
        itemCount: items.length,
        error: 'Supplier email not found'
      };
    }
    
    // Build email body
    const orderDate = format(new Date(), 'dd/MM/yyyy');
    let body = `Dear Imperial Laundry,\n\nPlease process the following linen order for delivery to:\n`;
    body += `- Head Office: Northstay, Head Office, York\n`;
    body += `- "Building B": Northstay, Building B Court, York\n`;
    body += `- "Building A": Northstay, Building A Apartments, York\n\n`;
    body += `Order Details:\n`;
    
    let totalItems = 0;
    for (const item of items) {
      body += `${item.productName} - Qty: ${item.orderQty}\n`;
      totalItems += item.orderQty;
    }
    
    body += `\nTotal Items: ${totalItems}\n\n`;
    body += `Please confirm receipt and expected delivery date.\n\n`;
    body += `Thank you,\nNorthstay`;
    
    // Send email
    await sendGenericEmail({
      to: supplier.email,
      subject: `Linen Order - ${orderDate}`,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    
    // Create order in database
    const orderNumber = await storage.generateOrderNumber();
    const order = await storage.createOrder({
      orderNumber,
      supplierId: supplier.id,
      status: 'ordered',
      orderDate: new Date(),
      totalAmount: 0,
      notes: `Automated linen order - ${orderDate}`
    });
    
    // Add order items
    for (const item of items) {
      await storage.addOrderItem({
        orderId: order.id,
        productId: item.productId,
        quantity: item.orderQty,
        unitPrice: item.product.lastPurchasePrice || 0
      });
    }
    
    return {
      success: true,
      supplier: supplier.name,
      itemCount: items.length,
      orderId: order.id
    };
  } catch (error) {
    console.error('Error sending Imperial Laundry email:', error);
    return {
      success: false,
      supplier: 'Imperial Laundry',
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendHoopersEmail(items: OrderCalculation[]): Promise<EmailOrderResult> {
  try {
    // Get supplier info
    const supplier = items.length > 0 ? await storage.getSupplier(items[0].supplierId) : null;
    
    if (!supplier || !supplier.email) {
      return {
        success: false,
        supplier: 'Hoopers',
        itemCount: items.length,
        error: 'Supplier email not found'
      };
    }
    
    // Build email body
    const orderDate = format(new Date(), 'dd/MM/yyyy');
    let body = `Dear Hoopers,\n\nPlease process the following cleaning supplies order for delivery to:\n`;
    body += `- Head Office: Northstay, Head Office, York\n`;
    body += `- "Building B": Northstay, Building B Court, York\n`;
    body += `- "Building A": Northstay, Building A Apartments, York\n\n`;
    body += `Order Details:\n`;
    
    let totalItems = 0;
    for (const item of items) {
      body += `${item.productName} - Qty: ${item.orderQty}\n`;
      totalItems += item.orderQty;
    }
    
    body += `\nTotal Items: ${totalItems}\n\n`;
    body += `Please confirm receipt and expected delivery date.\n\n`;
    body += `Thank you,\nNorthstay`;
    
    // Send email
    await sendGenericEmail({
      to: supplier.email,
      subject: `Cleaning Supplies Order - ${orderDate}`,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });
    
    // Create order in database
    const orderNumber = await storage.generateOrderNumber();
    const order = await storage.createOrder({
      orderNumber,
      supplierId: supplier.id,
      status: 'ordered',
      orderDate: new Date(),
      totalAmount: 0,
      notes: `Automated cleaning supplies order - ${orderDate}`
    });
    
    // Add order items
    for (const item of items) {
      await storage.addOrderItem({
        orderId: order.id,
        productId: item.productId,
        quantity: item.orderQty,
        unitPrice: item.product.lastPurchasePrice || 0
      });
    }
    
    return {
      success: true,
      supplier: supplier.name,
      itemCount: items.length,
      orderId: order.id
    };
  } catch (error) {
    console.error('Error sending Hoopers email:', error);
    return {
      success: false,
      supplier: 'Hoopers',
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendAmazonSMS(items: OrderCalculation[], arasPhoneNumber: string): Promise<SMSOrderResult> {
  try {
    if (!arasPhoneNumber) {
      return {
        success: false,
        itemCount: items.length,
        error: 'Alex phone number not provided'
      };
    }
    
    // Build SMS body
    let message = `Hi Alex, please order the following items on Amazon Business:\n`;
    
    for (const item of items) {
      message += `${item.productName} - Qty: ${item.orderQty}\n`;
    }
    
    message += `\nTotal items: ${items.length}\n`;
    message += `Login to Amazon Business account to complete order.`;
    
    // Send SMS via JustCall
    const smsResult = await sendSMS(arasPhoneNumber, message);
    
    if (!smsResult.success) {
      throw new Error(smsResult.error || 'Failed to send SMS');
    }
    
    // Create pending orders in database for each item
    const orderIds: string[] = [];
    
    // Group items by supplier (Amazon)
    const amazonSupplier = items.length > 0 ? await storage.getSupplier(items[0].supplierId) : null;
    
    if (amazonSupplier) {
      const orderNumber = await storage.generateOrderNumber();
      const order = await storage.createOrder({
        orderNumber,
        supplierId: amazonSupplier.id,
        status: 'pending_manual',
        orderDate: new Date(),
        totalAmount: 0,
        notes: `Manual Amazon order - SMS sent to Alex`
      });
      
      orderIds.push(order.id);
      
      // Add order items
      for (const item of items) {
        await storage.addOrderItem({
          orderId: order.id,
          productId: item.productId,
          quantity: item.orderQty,
          unitPrice: item.product.lastPurchasePrice || 0
        });
      }
    }
    
    return {
      success: true,
      itemCount: items.length,
      orderIds
    };
  } catch (error) {
    console.error('Error sending Amazon SMS:', error);
    return {
      success: false,
      itemCount: items.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
