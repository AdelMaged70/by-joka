import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Manual env parsing for script
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
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

function sha256(data: string | Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
}

function hmac(key: string | Buffer, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
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
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256(corsConfiguration).toString('hex');
    
    const canonicalUri = '/';
    const canonicalQueryString = 'cors';
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
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
        amzDate,
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
            'x-amz-date': amzDate,
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
    }
}

setCors().catch(console.error);
