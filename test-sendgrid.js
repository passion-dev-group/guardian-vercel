// Test script for SendGrid integration
// Run this with: node test-sendgrid.js

const SENDGRID_API_KEY = "";

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY environment variable not set');
  console.log('Please set your SendGrid API key:');
  console.log('export SENDGRID_API_KEY=your_api_key_here');
  process.exit(1);
}

async function testSendGrid() {
  console.log('🧪 Testing SendGrid integration...');
  
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: "georgelmitzel@armyspy.com", name: "Test User" }],
            subject: "Test Email from MiTurn",
          },
        ],
        from: { email: "support@miturn.org", name: "MiTurn Test" },
        content: [
          {
            type: "text/plain",
            value: "This is a test email from MiTurn SendGrid integration.",
          },
          {
            type: "text/html",
            value: "<h1>Test Email</h1><p>This is a test email from MiTurn SendGrid integration.</p>",
          },
        ],
      }),
    });
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ SendGrid API connection successful!');
      console.log('📧 Test email would be sent (check your SendGrid dashboard)');
    } else {
      console.error('❌ SendGrid API error:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ Error testing SendGrid:', error.message);
  }
}

testSendGrid(); 