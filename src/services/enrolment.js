import axcelerateClient from '../services/axcelerate.js';
import { SyncLogRepository, ProductMappingRepository } from '../db/repositories.js';
import { parseCustomerData, extractBookingMetadata, retryWithBackoff } from '../utils/helpers.js';

/**
 * Main enrolment service
 * Handles the business logic for processing orders and creating enrolments
 */
class EnrolmentService {
  /**
   * Process a Shopify order and create enrolments
   * @param {Object} order - Shopify order object
   * @returns {Promise<Object>} Processing result
   */
  async processOrder(order) {
    console.log(`\n📦 Processing order: ${order.name} (ID: ${order.id})`);

    const results = {
      orderId: order.id,
      orderNumber: order.name,
      success: [],
      failed: [],
      skipped: []
    };

    // Check if order already processed
    const alreadyProcessed = await SyncLogRepository.isOrderProcessed(order.id.toString());
    if (alreadyProcessed) {
      console.log(`⏭️  Order ${order.name} already processed, skipping`);
      return {
        ...results,
        status: 'skipped',
        message: 'Order already processed'
      };
    }

    // Parse customer data
    const customerData = parseCustomerData(order);
    console.log(`👤 Customer: ${customerData.emailAddress}`);

    // Get or create contact in aXcelerate
    let contact;
    try {
      contact = await retryWithBackoff(
        async () => await axcelerateClient.getOrCreateContact(customerData),
        3,
        1000
      );
      console.log(`✅ Contact ready: ${contact.CONTACTID || contact.contactID}`);
    } catch (error) {
      console.error('❌ Failed to get/create contact:', error.message);
      
      // Log failure for all line items
      for (const lineItem of order.line_items) {
        await this.logLineItemFailure(order, lineItem, null, null, error.message);
      }
      
      return {
        ...results,
        status: 'failed',
        error: `Contact creation failed: ${error.message}`
      };
    }

    const contactId = contact.CONTACTID || contact.contactID;

    // Process each line item
    for (const lineItem of order.line_items) {
      try {
        const itemResult = await this.processLineItem(order, lineItem, contactId, customerData);
        
        if (itemResult.success) {
          results.success.push(itemResult);
        } else if (itemResult.skipped) {
          results.skipped.push(itemResult);
        } else {
          results.failed.push(itemResult);
        }
      } catch (error) {
        console.error(`❌ Failed to process line item ${lineItem.id}:`, error.message);
        results.failed.push({
          lineItemId: lineItem.id,
          productTitle: lineItem.title,
          error: error.message
        });
      }
    }

    // Determine overall status
    let overallStatus = 'success';
    if (results.failed.length > 0 && results.success.length === 0) {
      overallStatus = 'failed';
    } else if (results.failed.length > 0 && results.success.length > 0) {
      overallStatus = 'partial';
    }

    console.log(`\n✨ Order processing complete: ${results.success.length} success, ${results.failed.length} failed, ${results.skipped.length} skipped\n`);

    return {
      ...results,
      status: overallStatus
    };
  }

  /**
   * Process a single line item from the order
   */
  async processLineItem(order, lineItem, contactId, customerData) {
    console.log(`\n  📌 Processing: ${lineItem.title} (Qty: ${lineItem.quantity})`);

    // Extract booking metadata
    const bookingMetadata = extractBookingMetadata(lineItem);
    console.log(`  📅 Booking metadata:`, bookingMetadata);

    // Get product mapping
    const mapping = await ProductMappingRepository.getByProductId(lineItem.product_id.toString());
    
    if (!mapping) {
      console.log(`  ⚠️  No mapping found for product ${lineItem.product_id}`);
      
      await SyncLogRepository.create({
        shopifyOrderId: order.id.toString(),
        shopifyOrderNumber: order.name,
        shopifyLineItemId: lineItem.id.toString(),
        customerEmail: customerData.emailAddress,
        customerName: `${customerData.givenName} ${customerData.surname}`,
        productTitle: lineItem.title,
        axcelerateContactId: contactId,
        axcelerateEnrolmentId: null,
        axcelerateInstanceId: null,
        status: 'skipped',
        errorMessage: 'No product mapping configured',
        metadata: { bookingMetadata }
      });

      return {
        lineItemId: lineItem.id,
        productTitle: lineItem.title,
        skipped: true,
        reason: 'No product mapping configured'
      };
    }

    const instanceId = mapping.axcelerate_instance_id;
    console.log(`  🎓 Target class instance: ${instanceId}`);

    // Verify class instance exists
    try {
      await axcelerateClient.getClassInstance(instanceId);
    } catch (error) {
      console.error(`  ❌ Class instance ${instanceId} not accessible:`, error.message);
      
      await this.logLineItemFailure(
        order,
        lineItem,
        contactId,
        instanceId,
        `Class instance not accessible: ${error.message}`,
        bookingMetadata
      );

      return {
        lineItemId: lineItem.id,
        productTitle: lineItem.title,
        success: false,
        error: `Class instance not accessible: ${error.message}`
      };
    }

    // Determine who should be enrolled: attendee from booking or purchaser
    let enrolmentContactId = contactId;
    let enrolmentContactData = customerData;
    let attendeeInfo = null;

    // If attendee information is available in booking metadata, use it
    if (bookingMetadata.attendeeName || (bookingMetadata.attendeeGivenName && bookingMetadata.attendeeSurname)) {
      console.log(`  👤 Attendee found in booking: ${bookingMetadata.attendeeName}`);
      
      // Build attendee contact data
      enrolmentContactData = {
        givenName: bookingMetadata.attendeeGivenName || customerData.givenName,
        surname: bookingMetadata.attendeeSurname || customerData.surname,
        emailAddress: bookingMetadata.attendeeEmail || customerData.emailAddress,
        mobilePhone: bookingMetadata.attendeePhone || customerData.mobilePhone,
        // Use purchaser's address information
        streetAddress: customerData.streetAddress,
        suburb: customerData.suburb,
        state: customerData.state,
        postcode: customerData.postcode,
        country: customerData.country
      };

      // Get or create contact for attendee
      try {
        const attendeeContact = await retryWithBackoff(
          async () => await axcelerateClient.getOrCreateContact(enrolmentContactData),
          3,
          1000
        );
        
        enrolmentContactId = attendeeContact.CONTACTID || attendeeContact.contactID;
        console.log(`  ✅ Attendee contact ready: ${enrolmentContactId}`);
        
        attendeeInfo = {
          name: bookingMetadata.attendeeName,
          contactId: enrolmentContactId,
          isPurchaser: false
        };
      } catch (error) {
        console.error(`  ⚠️  Could not create attendee contact, falling back to purchaser:`, error.message);
        // Fall back to purchaser if attendee contact creation fails
        attendeeInfo = {
          name: `${customerData.givenName} ${customerData.surname}`,
          contactId: contactId,
          isPurchaser: true,
          error: error.message
        };
      }
    } else {
      console.log(`  👤 No attendee info found, using purchaser`);
      attendeeInfo = {
        name: `${customerData.givenName} ${customerData.surname}`,
        contactId: contactId,
        isPurchaser: true
      };
    }

    // Create enrolments based on quantity
    const quantity = lineItem.quantity || 1;
    
    if (quantity === 1) {
      return await this.createSingleEnrolment(
        order,
        lineItem,
        enrolmentContactId,
        instanceId,
        enrolmentContactData,
        bookingMetadata,
        attendeeInfo
      );
    } else {
      return await this.createMultipleEnrolments(
        order,
        lineItem,
        enrolmentContactId,
        instanceId,
        quantity,
        enrolmentContactData,
        bookingMetadata,
        attendeeInfo
      );
    }
  }

  /**
   * Create a single enrolment
   */
  async createSingleEnrolment(order, lineItem, contactId, instanceId, customerData, bookingMetadata, attendeeInfo = null) {
    try {
      const enrolment = await retryWithBackoff(
        async () => await axcelerateClient.createEnrolment({
          contactID: contactId,
          instanceID: instanceId,
          type: 'p',
          tentative: false
        }),
        3,
        1000
      );

      const learnerId = enrolment.LEARNERID || enrolment.learnerID;
      console.log(`  ✅ Enrolment created: ${learnerId}`);

      const logMetadata = { bookingMetadata, enrolment };
      if (attendeeInfo) {
        logMetadata.attendee = attendeeInfo;
      }

      await SyncLogRepository.create({
        shopifyOrderId: order.id.toString(),
        shopifyOrderNumber: order.name,
        shopifyLineItemId: lineItem.id.toString(),
        customerEmail: customerData.emailAddress,
        customerName: attendeeInfo ? attendeeInfo.name : `${customerData.givenName} ${customerData.surname}`,
        productTitle: lineItem.title,
        axcelerateContactId: contactId,
        axcelerateEnrolmentId: learnerId,
        axcelerateInstanceId: instanceId,
        status: 'success',
        metadata: logMetadata
      });

      return {
        lineItemId: lineItem.id,
        productTitle: lineItem.title,
        success: true,
        enrolmentId: learnerId,
        contactId,
        instanceId,
        attendeeInfo
      };
    } catch (error) {
      console.error(`  ❌ Enrolment failed:`, error.message);
      
      await this.logLineItemFailure(
        order,
        lineItem,
        contactId,
        instanceId,
        error.message,
        bookingMetadata,
        attendeeInfo
      );

      return {
        lineItemId: lineItem.id,
        productTitle: lineItem.title,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create multiple enrolments (group booking)
   * Note: All enrolments will be for the same attendee (as per Easy Appointment Booking)
   */
  async createMultipleEnrolments(order, lineItem, contactId, instanceId, quantity, customerData, bookingMetadata, attendeeInfo = null) {
    console.log(`  👥 Creating ${quantity} enrolments (group booking for same attendee)`);

    const result = await axcelerateClient.createMultipleEnrolments(
      contactId,
      instanceId,
      quantity
    );

    console.log(`  ✅ Created ${result.successCount}/${quantity} enrolments`);

    const logMetadata = { bookingMetadata, groupBooking: true, quantity };
    if (attendeeInfo) {
      logMetadata.attendee = attendeeInfo;
      logMetadata.note = `Group booking: ${quantity} enrolments for ${attendeeInfo.name}`;
    }

    // Log each successful enrolment
    for (const enrolment of result.success) {
      const learnerId = enrolment.LEARNERID || enrolment.learnerID;
      
      await SyncLogRepository.create({
        shopifyOrderId: order.id.toString(),
        shopifyOrderNumber: order.name,
        shopifyLineItemId: lineItem.id.toString(),
        customerEmail: customerData.emailAddress,
        customerName: attendeeInfo ? attendeeInfo.name : `${customerData.givenName} ${customerData.surname}`,
        productTitle: lineItem.title,
        axcelerateContactId: contactId,
        axcelerateEnrolmentId: learnerId,
        axcelerateInstanceId: instanceId,
        status: 'success',
        metadata: logMetadata
      });
    }

    // Log any failures
    for (const failure of result.failed) {
      await this.logLineItemFailure(
        order,
        lineItem,
        contactId,
        instanceId,
        `Enrolment ${failure.index}/${quantity} failed: ${failure.error}`,
        { ...bookingMetadata, groupBooking: true, quantity },
        attendeeInfo
      );
    }

    // Determine if this was successful
    const allSuccess = result.successCount === quantity;
    const anySuccess = result.successCount > 0;

    return {
      lineItemId: lineItem.id,
      productTitle: lineItem.title,
      success: allSuccess || anySuccess,
      partial: !allSuccess && anySuccess,
      enrolmentIds: result.success.map(e => e.LEARNERID || e.learnerID),
      contactId,
      instanceId,
      quantity,
      successCount: result.successCount,
      failedCount: result.failed.length,
      attendeeInfo
    };
  }

  /**
   * Log a line item failure
   */
  async logLineItemFailure(order, lineItem, contactId, instanceId, errorMessage, bookingMetadata = {}, attendeeInfo = null) {
    const customerData = parseCustomerData(order);
    
    const logMetadata = { bookingMetadata };
    if (attendeeInfo) {
      logMetadata.attendee = attendeeInfo;
    }
    
    await SyncLogRepository.create({
      shopifyOrderId: order.id.toString(),
      shopifyOrderNumber: order.name,
      shopifyLineItemId: lineItem.id.toString(),
      customerEmail: customerData.emailAddress,
      customerName: attendeeInfo ? attendeeInfo.name : `${customerData.givenName} ${customerData.surname}`,
      productTitle: lineItem.title,
      axcelerateContactId: contactId,
      axcelerateEnrolmentId: null,
      axcelerateInstanceId: instanceId,
      status: 'failed',
      errorMessage: errorMessage,
      metadata: logMetadata
    });
  }
}

// Export singleton instance
const enrolmentService = new EnrolmentService();
export default enrolmentService;

