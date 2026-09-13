export interface LinkedInProfile {
  sub: string;
  name: string;
  picture?: string;
  email?: string;
}

export interface PublishResult {
  success: boolean;
  postUrn?: string;
  postUrl?: string;
  error?: string;
}

// Active supported LinkedIn API versions (newest first)
export const ACTIVE_LINKEDIN_VERSIONS = ['202608', '202607', '202606', '202603', '202509', '202503'];

/**
 * Fetch LinkedIn Profile using Access Token (OpenID Connect / v2 /userinfo)
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch LinkedIn profile (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    sub: data.sub,
    name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
    picture: data.picture,
    email: data.email,
  };
}

/**
 * Upload an image asset to LinkedIn using the 2-step REST Images API
 */
export async function uploadLinkedInImage(
  accessToken: string,
  personUrn: string,
  imageUrl: string
): Promise<string> {
  let buffer: Buffer;
  let contentType = 'image/jpeg';

  // 1. Resolve image buffer from data URL or remote HTTP URL
  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      contentType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      throw new Error('Invalid base64 data URL format');
    }
  } else {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ReachOutAI/1.0',
      },
    });

    if (!imgRes.ok) {
      throw new Error(`Failed to download image from source URL (${imgRes.status})`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  }

  // 2. Initialize Upload Request to LinkedIn with active version fallback
  let initData: any = null;
  let lastInitError: any = null;

  for (const version of ACTIVE_LINKEDIN_VERSIONS) {
    try {
      const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': version,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: personUrn,
          },
        }),
      });

      if (initRes.ok) {
        initData = await initRes.json();
        break;
      } else {
        const errText = await initRes.text();
        lastInitError = new Error(`LinkedIn image upload init failed (${initRes.status}) on version ${version}: ${errText}`);
        if (initRes.status === 426) {
          // Version inactive, try next version
          continue;
        }
        break;
      }
    } catch (e: any) {
      lastInitError = e;
    }
  }

  if (!initData) {
    throw lastInitError || new Error('Failed to initialize image upload with all active LinkedIn API versions');
  }

  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

  if (!uploadUrl || !imageUrn) {
    throw new Error('LinkedIn did not return uploadUrl or imageUrn');
  }

  // 3. PUT image binary data to uploadUrl
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Uploading binary to LinkedIn failed (${putRes.status}): ${errText}`);
  }

  return imageUrn;
}

/**
 * Publish Post to LinkedIn (Community Management / REST Posts API)
 */
export async function publishToLinkedIn(
  accessToken: string,
  personUrn: string,
  postContent: string,
  imageUrl?: string | null,
  topicTitle?: string
): Promise<PublishResult> {
  try {
    let imageUrn: string | null = null;

    if (imageUrl) {
      try {
        imageUrn = await uploadLinkedInImage(accessToken, personUrn, imageUrl);
      } catch (imgErr) {
        console.warn('Image upload failed, falling back to text-only post:', imgErr);
      }
    }

    const payload: any = {
      author: personUrn,
      commentary: postContent,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    if (imageUrn) {
      payload.content = {
        media: {
          id: imageUrn,
          title: topicTitle || 'AI & Tech Research',
        },
      };
    }

    let lastErrorText = '';
    for (const version of ACTIVE_LINKEDIN_VERSIONS) {
      const res = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': version,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const postUrn = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || '';
        const postUrl = postUrn
          ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}`
          : 'https://www.linkedin.com/feed/';

        return {
          success: true,
          postUrn,
          postUrl,
        };
      }

      lastErrorText = await res.text();
      if (res.status === 426) {
        continue;
      }
      return {
        success: false,
        error: `LinkedIn API error (${res.status}): ${lastErrorText}`,
      };
    }

    return {
      success: false,
      error: `LinkedIn API error (426): ${lastErrorText}`,
    };
  } catch (err: any) {
    console.error('LinkedIn publishing error:', err);
    return {
      success: false,
      error: err.message || 'Unknown LinkedIn publishing error',
    };
  }
}
