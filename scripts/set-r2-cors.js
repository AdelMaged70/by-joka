const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Manual env parsing
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) env[parts[0].trim()] = parts[1].trim();
});

const R2_BUCKET = env['R2_BUCKET'];
const R2_ACCOUNT_ID = env['R2_ACCOUNT_ID'];
const R2_ACCESS_KEY_ID = env['R2_ACCESS_KEY_ID'];
const R2_SECRET_ACCESS_KEY = env['R2_SECRET_ACCESS_KEY'];

if (!R2_BUCKET || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing R2 environment variables in .env.local');
    process.exit(1);
}

const host = `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

function sha256(data) {
    return crypto.createHash('sha256').update(data).digest();
}

function hmac(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = hmac('AWS4' + key, dateStamp);
    const kRegion = hmac(kDate, regionName);
    const kService = hmac(kRegion, serviceName);
    const kSigning = hmac(kService, 'aws4_request');
    return kSigning;
}

const corsConfiguration = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`;

async function setCors() {
    const method = 'PUT';
    const region = 'auto';
    const service = 's3';
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').split('.')[0] + 'Z';
    // Wait, S3 format is YYYYMMDDTHHMMSSZ
    const amzDateFixed = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDateFixed.slice(0, 8);
    const payloadHash = sha256(corsConfiguration).toString('hex');
    
    const canonicalUri = '/';
    const canonicalQueryString = 'cors';
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDateFixed}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');
    
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDateFixed,
        credentialScope,
        sha256(canonicalRequest).toString('hex')
    ].join('\n');
    
    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = hmac(signingKey, stringToSign).toString('hex');
    
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    console.log(`📡 Setting CORS for bucket: ${R2_BUCKET}...`);
    
    const response = await fetch(`https://${host}/?cors`, {
        method,
        headers: {
            'Authorization': authorizationHeader,
            'x-amz-date': amzDateFixed,
            'x-amz-content-sha256': payloadHash,
            'Content-Type': 'application/xml',
        },
        body: corsConfiguration
    });

    if (response.ok) {
        console.log('✅ CORS configuration updated successfully!');
    } else {
        const text = await response.text();
        console.error('❌ Failed to set CORS:', response.status, text);
        if (text.includes('SignatureDoesNotMatch')) {
            console.log('Hint: Check your environment variables and system time.');
        }
    }
}

setCors().catch(console.error);
