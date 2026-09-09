import crypto from 'crypto';

const R2_BUCKET = process.env.R2_BUCKET!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;


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

export async function getSignedUrl(method: string, key: string, contentType: string, expiresIn = 3600) {
    const region = 'auto';
    const service = 's3';
    const host = `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const endpoint = `https://${host}`;
    
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    
    const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': expiresIn.toString(),
        'X-Amz-SignedHeaders': 'content-type;host',
    };
    
    // Sort query params
    const sortedQueryString = Object.keys(queryParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
        
    const canonicalRequest = [
        method,
        '/' + key.split('/').map(encodeURIComponent).join('/'),
        sortedQueryString,
        `content-type:${contentType}\nhost:${host}\n`,
        'content-type;host',
        'UNSIGNED-PAYLOAD'
    ].join('\n');
    
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(canonicalRequest).toString('hex')
    ].join('\n');
    
    const signingKey = getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = hmac(signingKey, stringToSign).toString('hex');
    
    return `${endpoint}/${key}?${sortedQueryString}&X-Amz-Signature=${signature}`;

}

export async function deleteObject(key: string) {
    const region = 'auto';
    const service = 's3';
    const host = `${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/');
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    const payloadHash = sha256('').toString('hex');
    
    const canonicalRequest = [
        'DELETE',
        canonicalUri,
        '',
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
    
    const response = await fetch(`https://${host}${canonicalUri}`, {
        method: 'DELETE',
        headers: {
            'Authorization': authorizationHeader,
            'x-amz-date': amzDate,
            'x-amz-content-sha256': payloadHash,
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('R2 Delete Error:', text);
        throw new Error(`Failed to delete from R2: ${response.statusText}`);
    }
}
