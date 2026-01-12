import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles matching the pawn ticket layout
const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  // Main container with border
  container: {
    border: '2pt solid black',
    padding: 0,
  },

  // Top header section
  topSection: {
    borderBottom: '2pt solid black',
    flexDirection: 'row',
  },
  leftHeader: {
    width: '65%',
    borderRight: '2pt solid black',
    padding: 8,
    fontSize: 7,
    flexDirection: 'row',
  },
  leftHeaderLeft: {
    flex: 1,
  },
  leftHeaderRight: {
    flex: 1,
    paddingLeft: 10,
  },
  rightHeader: {
    width: '35%',
    padding: 8,
    alignItems: 'center',
  },
  agreementText: {
    fontSize: 6,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  businessName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  businessInfo: {
    fontSize: 7,
    marginBottom: 1,
  },
  andText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  clientInfo: {
    fontSize: 7,
    marginBottom: 1,
  },
  ticketNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  barcode: {
    fontSize: 16,
    fontFamily: 'Courier',
    marginBottom: 4,
  },
  clerkLabel: {
    fontSize: 7,
    marginTop: 8,
  },

  // Security interest section
  securitySection: {
    borderBottom: '2pt solid black',
    padding: 8,
    fontSize: 7,
  },
  securityText: {
    fontSize: 6,
    marginBottom: 4,
  },

  // Main content area (items table + right panel wrapper)
  mainContentArea: {
    flexDirection: 'row',
    borderBottom: '2pt solid black',
  },

  // Items table (left side of main content)
  itemsTable: {
    width: '65%',
    borderRight: '2pt solid black',
    minHeight: 150,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  itemNumberCol: {
    width: '15%',
  },
  descriptionCol: {
    width: '60%',
  },
  priceCol: {
    width: '25%',
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    padding: 4,
    minHeight: 60,
    borderTop: '1pt solid #ccc',
  },

  // Right side panel (due date and fees)
  rightPanel: {
    width: '35%',
  },
  dueDateBox: {
    borderBottom: '2pt solid black',
    padding: 8,
  },
  dueDateLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dueDateValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1pt solid black',
    padding: 6,
  },
  feeRowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
  },
  feeLabel: {
    fontSize: 7,
    flex: 1,
  },
  feeSubtext: {
    fontSize: 5,
    fontStyle: 'italic',
  },
  feeAmount: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  // Bottom signature section
  bottomSection: {
    flexDirection: 'row',
    borderTop: '2pt solid black',
  },
  signatureBox: {
    width: '50%',
    padding: 8,
    minHeight: 120,
  },
  signatureBoxRight: {
    width: '50%',
    padding: 8,
    minHeight: 120,
    borderLeft: '2pt solid black',
  },
  signatureHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 4,
    marginBottom: 6,
    textAlign: 'center',
  },
  signatureText: {
    fontSize: 6,
    lineHeight: 1.4,
    marginBottom: 20,
  },
  signatureLine: {
    borderBottom: '1pt solid black',
    marginTop: 'auto',
    paddingTop: 20,
  },
  dateSignedLabel: {
    fontSize: 7,
    marginBottom: 2,
  },
  xMark: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Cost info box
  costBox: {
    borderTop: '1pt solid black',
    padding: 6,
  },
  costLabel: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  costAmount: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  costSubtext: {
    fontSize: 5,
    marginTop: 2,
  },

  bold: {
    fontWeight: 'bold',
  },

  // Terms and Conditions page styles
  termsPage: {
    padding: 20,
    fontSize: 7,
    lineHeight: 1.4,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  termsNumberedList: {
    marginLeft: 15,
  },
  termsItem: {
    marginBottom: 6,
    flexDirection: 'row',
  },
  termsNumber: {
    width: 20,
    fontWeight: 'bold',
  },
  termsContent: {
    flex: 1,
  },
  termsSubList: {
    marginLeft: 20,
    marginTop: 3,
  },
  termsSubItem: {
    marginBottom: 3,
    flexDirection: 'row',
  },
  termsSubNumber: {
    width: 15,
  },
});

const PawnTicketTemplate = ({
  ticketType = 'pawn', // 'pawn', 'buy', or 'sale'
  businessName,
  businessAddress,
  businessPhone,
  businessLogo,
  businessLogoMimetype,
  customerName,
  customerAddress,
  customerPhone,
  customerID,
  employeeName,
  ticketId,
  formattedDate,
  formattedTime,
  dueDate,
  ticketItems,
  principalAmount,
  appraisalFee,
  interestRate,
  interestAmount,
  insuranceCost,
  extensionCost,
  totalCostOfBorrowing,
  totalRedemptionAmount,
  legalTerms,
  termDays,
  frequencyDays
}) => {
  // Use termDays from props, default to 62 if not provided
  const term = termDays || 62;
  const frequency = frequencyDays || 30;

  // Parse formatted date and time for agreement text
  const transactionDateObj = formattedDate ? new Date(formattedDate) : new Date();
  const day = transactionDateObj.getDate();
  const month = transactionDateObj.toLocaleDateString('en-US', { month: 'long' });
  const year = transactionDateObj.getFullYear();

  // Define text based on ticket type
  const agreementType = ticketType === 'pawn' ? 'Pawn' : ticketType === 'buy' ? 'Buy' : 'Sale';
  const agreementAction = ticketType === 'pawn' ? 'PAWN' : ticketType === 'buy' ? 'SELL' : 'PURCHASE';
  const itemAction = ticketType === 'pawn' ? 'pledged' : ticketType === 'buy' ? 'sold' : 'purchased';
  const itemActionUpper = ticketType === 'pawn' ? 'PLEDGED' : ticketType === 'buy' ? 'SOLD' : 'PURCHASED';
  const redeemText = ticketType === 'pawn' ? 'REDEEM PAWNED' : ticketType === 'buy' ? 'RECEIVE PAYMENT FOR SOLD' : 'RECEIVE PURCHASED';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.container}>
          {/* Top Header Section */}
          <View style={styles.topSection}>
            {/* Left side - Business and Client Info */}
            <View style={styles.leftHeader}>
              <View style={{ width: '100%' }}>
                <Text style={styles.agreementText}>
                  This {agreementType} Agreement is made on {day} {month}, {year} at {formattedTime || '[time]'} between the following two parties:
                </Text>

                {/* Business and Client on same line with AND + Logo in middle */}
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  {/* Business Info - Left */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.businessName}>{businessName || 'Evergreen Traders South'}</Text>
                    <Text style={styles.businessInfo}>(Henceforth known as "Evergreen")</Text>
                    <Text style={styles.businessInfo}>{businessAddress || '524 Smythe st.'}</Text>
                    <Text style={styles.businessInfo}>{businessPhone || '(506) 455-2274'}</Text>
                  </View>

                  {/* AND and Logo in middle */}
                  <View style={{ width: 60, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 }}>
                    <Text style={styles.andText}>AND</Text>
                    {businessLogo && businessLogoMimetype && (
                      <Image
                        src={`data:${businessLogoMimetype};base64,${businessLogo}`}
                        style={{ width: 50, height: 50, marginTop: 2 }}
                      />
                    )}
                  </View>

                  {/* Client Info - Right */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientInfo}><Text style={styles.bold}>{customerName || '[name]'}</Text></Text>
                    <Text style={styles.clientInfo}>(Henceforth known as "The Client")</Text>
                    <Text style={styles.clientInfo}><Text style={styles.bold}>{customerAddress || '[Address]'}</Text></Text>
                    <Text style={styles.clientInfo}><Text style={styles.bold}>{customerPhone || '[Phone Number]'}</Text></Text>
                    <Text style={styles.clientInfo}><Text style={styles.bold}>{customerID || '[ID]'}</Text></Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right side - Ticket Info */}
            <View style={styles.rightHeader}>
              <Text style={styles.ticketNumber}>{agreementType} trx#</Text>
              <Text style={styles.ticketNumber}>{ticketId || 'LT-TSD000000'}</Text>
              <Text style={styles.barcode}>|||| |||| |||| ||||</Text>
              <Text style={styles.clerkLabel}>Clerk:</Text>
              <Text style={styles.clerkLabel}>{employeeName || '_______'}</Text>
            </View>
          </View>

          {/* Main Content Area - Items Table + Right Panel */}
          <View style={styles.mainContentArea}>
            {/* Items Table */}
            <View style={styles.itemsTable}>
              {/* Security Interest Text */}
              <View style={{ padding: 6, borderBottom: '2pt solid black' }}>
                <Text style={styles.securityText}>
                  As security for the Client's obligations under this Agreement, the Client deposits with and grants to Evergreen a security interest in the following item(s):
                </Text>
              </View>

              <View style={styles.itemsHeader}>
                <Text style={styles.itemNumberCol}>Item #</Text>
                <Text style={styles.descriptionCol}>Description</Text>
                <Text style={styles.priceCol}>Price</Text>
              </View>

              {ticketItems && ticketItems.length > 0 ? (
                ticketItems.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemNumberCol}>{idx + 1}</Text>
                    <Text style={styles.descriptionCol}>
                      {item.item_details?.long_desc || item.item_details?.description || item.description || ''}
                    </Text>
                    <Text style={styles.priceCol}>${parseFloat(item.item_price || item.item_details?.item_price || 0).toFixed(2)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.itemRow}>
                  <Text style={styles.itemNumberCol}></Text>
                  <Text style={styles.descriptionCol}></Text>
                  <Text style={styles.priceCol}></Text>
                </View>
              )}
            </View>

            {/* Right Side Panel - Due Date and Fees */}
            <View style={styles.rightPanel}>
            {/* Due Date */}
            <View style={styles.dueDateBox}>
              <Text style={styles.dueDateLabel}>Due Date (Term: {term} Days):</Text>
              <Text style={styles.dueDateValue}>{dueDate || '[Day] [Month], [Year]'}</Text>
            </View>

            {/* Principal Amount */}
            <View style={styles.feeRow}>
              <View style={styles.feeLabel}>
                <Text style={styles.bold}>Principal Amount:</Text>
                <Text style={styles.feeSubtext}>(Money advanced)</Text>
              </View>
              <Text style={styles.feeAmount}>${(principalAmount || 0).toFixed(2)}</Text>
            </View>

            {/* Appraisal Fee */}
            <View style={styles.feeRow}>
              <View style={styles.feeLabel}>
                <Text style={styles.bold}>Appraisal Fee:</Text>
                <Text style={styles.feeSubtext}>(For new loans and renewals only)</Text>
              </View>
              <Text style={styles.feeAmount}>${(appraisalFee || 0).toFixed(2)}</Text>
            </View>

            {/* Interest */}
            <View style={styles.feeRow}>
              <View style={styles.feeLabel}>
                <Text style={styles.bold}>Interest:</Text>
                <Text style={styles.feeSubtext}>({interestRate || '2.9'}% per {frequency} days)</Text>
              </View>
              <Text style={styles.feeAmount}>${(interestAmount || 0).toFixed(2)}</Text>
            </View>

            {/* Insurance */}
            <View style={styles.feeRow}>
              <View style={styles.feeLabel}>
                <Text style={styles.bold}>Insurance:</Text>
                <Text style={styles.feeSubtext}>(1% per {frequency} days)</Text>
              </View>
              <Text style={styles.feeAmount}>${(insuranceCost || 0).toFixed(2)}</Text>
            </View>

            {/* Total Amount */}
            <View style={{ borderTop: '2pt solid black', padding: 6, backgroundColor: '#f9f9f9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{ticketType === 'pawn' ? 'TOTAL TO REDEEM:' : 'TOTAL AMOUNT:'}</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>${ticketType === 'pawn' ? (totalRedemptionAmount || 0).toFixed(2) : (principalAmount || 0).toFixed(2)}</Text>
              </View>
              <Text style={{ fontSize: 5, marginTop: 2, fontStyle: 'italic' }}>{ticketType === 'pawn' ? '(Principal + All Fees)' : '(Total Transaction Amount)'}</Text>
            </View>

            </View>
          </View>

          {/* Bottom Section - Signatures (left) and Cost Info (right) */}
          <View style={{ flexDirection: 'row', borderTop: '2pt solid black' }}>
            {/* Left side - Signature boxes */}
            <View style={{ width: '65%', borderRight: '2pt solid black', flexDirection: 'row' }}>
              {/* Sign to Complete Transaction */}
              <View style={{ width: '50%', padding: 6, borderRight: '2pt solid black' }}>
                <View style={{ backgroundColor: '#d0d0d0', padding: 3, marginBottom: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold', textAlign: 'center' }}>SIGN BELOW TO {agreementAction} ITEM(S)</Text>
                </View>
                <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 12 }}>
                  The text above correctly describes the {itemAction} item(s). I have read the front and back of this Agreement and understand the Terms and Conditions. I warrant that all declarations are true and correct. I acknowledge receipt of a true copy of this Agreement. By signing below I enter into this Agreement and accept the terms as described.
                </Text>
                <View style={{ marginTop: 'auto' }}>
                  <Text style={{ fontSize: 6, marginBottom: 2 }}>Date Signed:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginRight: 4 }}>X</Text>
                    <View style={{ flex: 1, borderBottom: '1pt solid black', marginBottom: 2 }}></View>
                  </View>
                </View>
              </View>

              {/* Sign to Complete Second Part of Transaction */}
              <View style={{ width: '50%', padding: 6 }}>
                <View style={{ backgroundColor: '#d0d0d0', padding: 3, marginBottom: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold', textAlign: 'center' }}>SIGN BELOW TO {redeemText} ITEM(S)</Text>
                </View>
                <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 12 }}>
                  I hereby acknowledge receipt of the item(s) {itemAction} in this Agreement. I have carefully examined the item(s) and have found them to be in satisfactory condition. {businessName} has fulfilled their obligations pursuant to the terms of this agreement and I release them from any claim or liability related to the item(s).
                </Text>
                <View style={{ marginTop: 'auto' }}>
                  <Text style={{ fontSize: 6, marginBottom: 2 }}>Date Signed:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginRight: 4 }}>X</Text>
                    <View style={{ flex: 1, borderBottom: '1pt solid black', marginBottom: 2 }}></View>
                  </View>
                </View>
              </View>
            </View>

            {/* Right side - Total Cost and Extension (Pawn) or Summary (Buy/Sale) */}
            <View style={{ width: '35%', padding: 6 }}>
              {ticketType === 'pawn' ? (
                <>
                  {/* Total Cost of Borrowing Header */}
                  <View style={{ backgroundColor: '#d0d0d0', padding: 3, marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 6, fontWeight: 'bold' }}>Total Cost of Borrowing:</Text>
                      <Text style={{ fontSize: 8, fontWeight: 'bold' }}>${(totalCostOfBorrowing || 0).toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Description text */}
                  <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 6 }}>
                    You are not obligated to redeem {itemAction} item(s).
                  </Text>
                  <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 8 }}>
                    If you need more time, you can extend the due date by paying the amount below. This is a payment of outstanding interest and fees only and does not reduce the principal.
                  </Text>

                  {/* Extension Cost */}
                  <View style={{ marginTop: 'auto' }}>
                    <View style={{ backgroundColor: '#d0d0d0', padding: 3, marginBottom: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 6, fontWeight: 'bold' }}>Extension Cost:</Text>
                          <Text style={{ fontSize: 4, fontStyle: 'italic' }}>(For an additional {frequency} days)</Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: 'bold' }}>${(extensionCost || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Transaction Summary for Buy/Sale */}
                  <View style={{ backgroundColor: '#d0d0d0', padding: 3, marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 6, fontWeight: 'bold' }}>Total Amount:</Text>
                      <Text style={{ fontSize: 8, fontWeight: 'bold' }}>${(principalAmount || 0).toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Thank you message */}
                  <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 6 }}>
                    Thank you for your business.
                  </Text>
                  <Text style={{ fontSize: 5, lineHeight: 1.3, marginBottom: 8 }}>
                    Please contact us if you have any questions or concerns about this transaction.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Terms and Conditions Section */}
          <View style={{ borderTop: '2pt solid black', padding: 10 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>{agreementAction} AGREEMENT - TERMS AND CONDITIONS</Text>

        <View style={styles.termsNumberedList}>
          {/* Term 1 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>1.</Text>
            <View style={styles.termsContent}>
              <Text>{ticketType === 'pawn'
                ? `To secure the principal of the loan, the Client hereby deposits the item(s) described on the reverse with ${businessName} and grants a security interest in said item(s). The Client declares that they:`
                : `The Client hereby ${ticketType === 'buy' ? 'sells' : 'purchases'} the item(s) described in this agreement to/from ${businessName}. The Client declares that they:`}</Text>
              <View style={styles.termsSubList}>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>a.</Text>
                  <Text style={{ flex: 1 }}>legally own the item(s) and they are free of any lien, are not rented, leased or otherwise encumbered.</Text>
                </View>
                {ticketType === 'pawn' && (
                  <View style={styles.termsSubItem}>
                    <Text style={styles.termsSubNumber}>b.</Text>
                    <Text style={{ flex: 1 }}>will repay all outstanding loan principal in the case of any dispute of ownership.</Text>
                  </View>
                )}
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>{ticketType === 'pawn' ? 'c' : 'b'}.</Text>
                  <Text style={{ flex: 1 }}>are not in bankruptcy or planning to declare it.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>{ticketType === 'pawn' ? 'd' : 'c'}.</Text>
                  <Text style={{ flex: 1 }}>are not an HST registrant and no input tax credit or rebate will be claimed on this transaction.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>{ticketType === 'pawn' ? 'e' : 'd'}.</Text>
                  <Text style={{ flex: 1 }}>have backed up and securely removed any personal or sensitive information from all electronic devices prior to {ticketType === 'pawn' ? 'pledging' : ticketType === 'buy' ? 'selling' : 'purchasing'} them.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Term 2 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>2.</Text>
            <Text style={styles.termsContent}>Item descriptions are based on a visual assessment only. Item condition and appraisals are not guaranteed to be 100% accurate. {ticketType === 'pawn' ? `Items must be held in secure storage at the expense of the Client. Under the terms of this Agreement, the amount advanced is paid to ${businessName} for the Principal Amount advanced to the Client.` : `All items are sold/purchased as-is without warranty unless otherwise stated in writing.`}</Text>
          </View>

          {/* Term 3 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>3.</Text>
            <Text style={styles.termsContent}>{ticketType === 'pawn' ? `The option to redeem ${itemAction} item(s) expires at store closing on the Due Date after which they are considered forfeited.` : `All sales are final unless otherwise agreed upon in writing.`}</Text>
          </View>

          {/* Term 4 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>4.</Text>
            <Text style={styles.termsContent}>The Client is not obligated to pay the following:</Text>
          </View>

          {/* Term 5 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>5.</Text>
            <View style={styles.termsContent}>
              <Text>Interest upon the principal amount as indicated in the Agreement.</Text>
              <View style={styles.termsSubList}>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>a.</Text>
                  <Text style={{ flex: 1 }}>Fees for extremely high value items may include costs necessary for insurance such as security systems, fire prevention, burglar safes, etc.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>b.</Text>
                  <Text style={{ flex: 1 }}>Recoupment of insurance, which may include necessary protection such as appraisal, testing, authentication and lien searches.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>c.</Text>
                  <Text style={{ flex: 1 }}>Fees for service(s) provided prior to the transaction such as appraisal, except this minimum allowable under this law then this transaction will be deemed to be written at the maximum by both parties.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>d.</Text>
                  <Text style={{ flex: 1 }}>If the interest, or any other charges levied in this transaction are paid in full, then such payment does not reduce the loan principal. The extended Agreement maintains all terms of the original.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Term 6 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>6.</Text>
            <Text style={styles.termsContent}>The Client may extend the due date by paying the applicable outstanding interest and fees. This does not reduce the loan principal. The extended Agreement maintains all terms of the original. If all outstanding interest and fees are paid in full, then additional amounts may be paid to Evergreen for the redeeming pledge prior to the Due Date. There is no discount for redeeming prior to the Due Date.</Text>
          </View>

          {/* Term 7 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>7.</Text>
            <Text style={styles.termsContent}>If all outstanding interest and fees are paid on or before the Due Date by paying all outstanding principal, interest and fees.</Text>
          </View>

          {/* Term 8 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>8.</Text>
            <View style={styles.termsContent}>
              <Text>The Client may redeem the pledged item(s). There is no penalty or fee for the redeeming prior to the Due Date. There is no discount for redeeming prior to the Due Date.</Text>
              <View style={styles.termsSubList}>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>a.</Text>
                  <Text style={{ flex: 1 }}>The Client is not obligated to redeem the pledged item(s). There is no penalty or fee for not redeeming. After removal, item condition is considered accepted.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>b.</Text>
                  <Text style={{ flex: 1 }}>Due to forfeited together. Redeemed item(s) will be returned to the ORIGINAL CLIENT ONLY upon presentation of valid government photo ID.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>c.</Text>
                  <Text style={{ flex: 1 }}>Redeemed item(s) must be thoroughly inspected by Client on premises immediately upon receipt. The Client cannot create an obligation for repayment on Evergreen Trader's behalf.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>d.</Text>
                  <Text style={{ flex: 1 }}>All items listed on this transaction must be redeemed together. Upon maturation date, then they become Evergreen Trader's sole property and are forfeited with the item(s).</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Term 9 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>9.</Text>
            <Text style={styles.termsContent}>If the pledged item(s) are not redeemed or extended by the Due Date, then the item(s) are deemed Evergreen Trader's property. Appraisals, certificates or warranty cards become sole property which may be resold. The Client understands the transfer of any receipts, appraisals, certificates, authentication with the item(s) include address, telephone number or email address. The client agrees to notify Evergreen immediately upon any change to contact information, legal name and to receive notifications for due dates and overdue payment reminders.</Text>
          </View>

          {/* Term 10 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>10.</Text>
            <View style={styles.termsContent}>
              <Text>Client Information: The Client agrees to promptly notify Evergreen of any change in address, email, and phone calls. The Client authorizes those numbers for contact as may be necessary.</Text>
              <View style={styles.termsSubList}>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>a.</Text>
                  <Text style={{ flex: 1 }}>The Client consents to receive communications via telephone with any agencies with any information concerning the Client as may be necessary.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>b.</Text>
                  <Text style={{ flex: 1 }}>The Client also authorizes Evergreen to provide information to third party text message-based services for Client on-based or Canada.</Text>
                </View>
                <View style={styles.termsSubItem}>
                  <Text style={styles.termsSubNumber}>c.</Text>
                  <Text style={{ flex: 1 }}>Evergreen may store Client information with software as required by both parties.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Term 11 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>11.</Text>
            <Text style={styles.termsContent}>Any alterations to the Agreement must be in writing and signed by both parties, allow at its sole discretion, modification of the Client to redeem pledged item(s) by providing a signed contract amendment.</Text>
          </View>

          {/* Term 12 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>12.</Text>
            <Text style={styles.termsContent}>The Agreement is non-transferable. Evergreen may, at its sole discretion, refuse the transfer. The remaining provisions will continue to be binding upon all parties.</Text>
          </View>

          {/* Term 13 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>13.</Text>
            <Text style={styles.termsContent}>Severability: If any part of this agreement is deemed invalid, the remaining provisions must be exercised in the jurisdiction to ensure item(s) of similar kind and quality (less the initial pledge amount advanced). This agreement is not affected by forfeiture, will be independently priced by the Client. Any reasonable market value less the item(s) pledged value or replacement cost, if desired, will be purchased by the Client.</Text>
          </View>

          {/* Term 14 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>14.</Text>
            <Text style={styles.termsContent}>Governing Law: This agreement is governed by New Brunswick law, and enforced in the item(s) jurisdiction where it is applicable. The Client may assert covenant, earthquakes, acts of war.</Text>
          </View>

          {/* Term 15 */}
          <View style={styles.termsItem}>
            <Text style={styles.termsNumber}>15.</Text>
            <Text style={styles.termsContent}>Waiver & Limits of Liability: Evergreen is insured for the lesser of replacement value for the item(s) and that any greater covered in the event amount announced. The Client understands that this is fair replacement value for the item(s) pledged. Evergreen Insurance will be the primary insurance and the Client holds will be the secondary insurance in the event of a claim. Loss or damage not covered by Evergreen' insurance (including but not limited to riots, floods, etc.) is at the sole risk of the Client.</Text>
          </View>
        </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PawnTicketTemplate;
