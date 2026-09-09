const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')

function generateExplanationPDF() {
  const doc = new PDFDocument({ margin: 50 })
  const pdfPath = path.resolve(__dirname, '../Paymob_Integration_Guide.pdf')
  const stream = fs.createWriteStream(pdfPath)
  doc.pipe(stream)

  // Colors
  const primaryColor = '#e31e24' // Red
  const secondaryColor = '#0070c0' // Blue
  const darkColor = '#0a0e1a'
  const textColor = '#333333'
  const lightBg = '#f4f6fa'

  // Header Title
  doc
    .fillColor(primaryColor)
    .font('Helvetica-Bold')
    .fontSize(26)
    .text('Shrimp House Integration Report', { align: 'center' })
  
  doc
    .fillColor(secondaryColor)
    .fontSize(16)
    .text('Paymob Mobile Wallet Checkout System', { align: 'center' })
    .moveDown(1.5)

  // Separator Line
  doc
    .strokeColor('#dddddd')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1.5)

  // Section 1: Overview
  doc
    .fillColor(darkColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('1. Overview & Architecture', { underline: true })
    .moveDown(0.5)

  doc
    .fillColor(textColor)
    .fontSize(10.5)
    .font('Helvetica')
    .text(
      'This document explains the technical architecture and implementation details for integrating Paymob Mobile Wallet (Vodafone Cash, Etisalat Cash, Orange Cash, WE Cash) payment methods into the Shrimp House web application.',
      { lineGap: 4 }
    )
    .moveDown(1)

  // Boxed Architectural Callout
  const boxY = doc.y
  doc
    .rect(50, boxY, 500, 75)
    .fill(lightBg)
  
  doc
    .fillColor(primaryColor)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('  Important Architectural Note on DB Statuses:', 55, boxY + 10)
    
  doc
    .fillColor(textColor)
    .font('Helvetica')
    .fontSize(9.5)
    .text(
      '  To prevent unpaid checkouts from flooding the kitchen cashiers dashboard, wallet orders are inserted\n  with a status of "canceled" (representing an unpaid state). Once payment webhook/redirect\n  verifies successful checkout, this status is promoted asynchronously to "pending" to alert cashiers.',
      55,
      boxY + 25,
      { lineGap: 2 }
    )

  doc.y = boxY + 85
  doc.moveDown(1)

  // Section 2: Folder Structure
  doc
    .fillColor(darkColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('2. Created Integration Routes & Pages', { underline: true })
    .moveDown(0.5)

  const routes = [
    {
      name: 'app/api/paymob/create-payment/route.ts',
      desc: 'POST route: Validates input, inserts the unpaid order into database, registers the transaction in Paymob, requests a mobile wallet URL, updates order notes, and returns the wallet validation redirect link.'
    },
    {
      name: 'app/api/paymob/webhook/route.ts',
      desc: 'POST route: Core system verification. Called by Paymob backend. It validates the transaction status & HMAC signature, and updates the database order to "pending" (meaning paid/active) and records the receipt ID.'
    },
    {
      name: 'app/api/paymob/verify/route.ts',
      desc: 'GET route: Serves as the merchant transaction response callback page. It validates parameters via HMAC signature verification, updates the order status immediately, and redirects the client to the success/failed UI.'
    },
    {
      name: 'app/payment-success/page.tsx',
      desc: 'Frontend Page: Displays a premium success confirmation dashboard in Arabic. It clears the local cart state and automatically navigates back to the homepage after 15 seconds.'
    },
    {
      name: 'app/payment-failed/page.tsx',
      desc: 'Frontend Page: Displays a failure screen in Arabic with debug codes and quick-links to checkout to retry the order.'
    }
  ]

  routes.forEach((route) => {
    doc
      .fillColor(secondaryColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`• ${route.name}`)
      .fillColor(textColor)
      .font('Helvetica')
      .fontSize(10)
      .text(route.desc, { indent: 15, lineGap: 3 })
      .moveDown(0.8)
  })

  doc.addPage()

  // Section 3: Frontend Checkout Modifications
  doc
    .fillColor(darkColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('3. Modified Core Application Components', { underline: true })
    .moveDown(0.8)

  doc
    .fillColor(secondaryColor)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Checkout Screen (app/checkout/page.tsx)')
    
  doc
    .fillColor(textColor)
    .font('Helvetica')
    .fontSize(10)
    .text(
      '• Added a new premium radio option for Paymob Mobile Wallets (Vodafone Cash, Etisalat Cash...).\n' +
      '• Implemented conditional fields where users fill their wallet mobile number, incorporating validations for Egyptian phone number format (01XXXXXXXX, 11 digits).\n' +
      '• Redirects users to Paymob payment screens on mobile wallet checkout submissions.',
      { lineGap: 4 }
    )
    .moveDown(1)

  doc
    .fillColor(secondaryColor)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Cashier Order Dashboard (app/admin/dashboard/page.tsx)')
  
  doc
    .fillColor(textColor)
    .font('Helvetica')
    .fontSize(10)
    .text(
      '• Upgraded the Postgres Realtime database subscription to listen to all events ("*") instead of only "INSERT" events.\n' +
      '• Implemented state-cached verification rules: plays dashboard alert sounds/toast popups whenever an order transitions from unpaid ("canceled") into paid ("pending"). This ensures cashiers never miss paid wallet orders.',
      { lineGap: 4 }
    )
    .moveDown(1.5)

  // Section 4: Security Features
  doc
    .fillColor(darkColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('4. Security & Cryptographic Verifications', { underline: true })
    .moveDown(0.5)

  doc
    .fillColor(textColor)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'To prevent spoofing or unauthorized order status updates, all callback API endpoints enforce a custom HMAC-SHA512 verification check. Concatenating ordered transaction details using a highly secure hashing comparison algorithm (timingSafeEqual) protects the server against timing attacks.',
      { lineGap: 4 }
    )
    .moveDown(1.5)

  // Section 5: Configuration Requirements
  doc
    .fillColor(darkColor)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('5. Required Environment Variables (.env.local)', { underline: true })
    .moveDown(0.5)

  doc
    .fillColor(textColor)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'Three environment variables must be populated to activate the integration:\n' +
      '1. PAYMOB_API_KEY: Found in your Paymob dashboard (developer API key).\n' +
      '2. PAYMOB_WALLET_INTEGRATION_ID: Numerical wallet checkout integration ID.\n' +
      '3. PAYMOB_HMAC_SECRET: Secret for signing and webhook verification callbacks.',
      { lineGap: 4 }
    )
    .moveDown(2)

  // Footer Signature
  doc
    .fillColor(primaryColor)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Restaruant Software Engineered successfully by Antigravity.', { align: 'center' })

  doc.end()
  console.log('PDF Generated Successfully at:', pdfPath)
}

generateExplanationPDF()
