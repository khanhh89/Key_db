import { API_BASE_URL, getAdminAuthToken } from './api';

/**
 * Utility helper to upload local images directly to Cloudinary CDN
 * Returns the secure Cloudinary HTTPS URL (e.g. https://res.cloudinary.com/...)
 */
export async function uploadToCloudinary(
  file: File,
  customCloudName?: string,
  customUploadPreset?: string
): Promise<string> {
  // 1. Try Spring Boot Backend Cloudinary Signed Upload Endpoint (uses API Key & API Secret from MySQL DB)
  try {
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const backendRes = await fetch(`${API_BASE_URL}/cloudinary/upload`, {
      method: 'POST',
      headers: {
        'X-Admin-Auth': getAdminAuthToken()
      },
      body: backendFormData
    });
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Backend Cloudinary upload endpoint unavailable, trying direct upload', err);
  }

  let cloudName = customCloudName;
  let uploadPreset = customUploadPreset;

  if (!cloudName) {
    try {
      const local = localStorage.getItem('modlienquan_config');
      if (local) {
        const config = JSON.parse(local);
        if (config.cloudinaryCloudName) cloudName = config.cloudinaryCloudName;
        if (config.cloudinaryUploadPreset) uploadPreset = config.cloudinaryUploadPreset;
      }
    } catch (e) {
      // ignore
    }
  }

  cloudName = cloudName || 'demo';
  uploadPreset = uploadPreset || 'unsigned';

  // 2. Try direct Cloudinary upload if configured
  if (cloudName && cloudName !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset || 'unsigned');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          return data.secure_url;
        }
      }
    } catch (err) {
      console.warn('Custom Cloudinary upload failed, attempting fallback', err);
    }
  }

  // 2. Try default Cloudinary demo upload endpoint
  try {
    const demoData = new FormData();
    demoData.append('file', file);
    demoData.append('upload_preset', 'docs_upload_example_us_preset');

    const res = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
      method: 'POST',
      body: demoData
    });
    if (res.ok) {
      const data = await res.json();
      if (data.secure_url) {
        return data.secure_url;
      }
    }
  } catch (err) {
    console.warn('Demo Cloudinary upload failed, fallback to Data URL', err);
  }

  // 3. Guaranteed fallback: Convert image file to Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}
