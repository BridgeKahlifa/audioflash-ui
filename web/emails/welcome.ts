export function welcomeEmail(unsubscribeLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the AudioFlash waitlist</title>
</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#FF6B4A;border-radius:12px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:700;font-size:16px;">A</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:600;color:#1A1A1A;">AudioFlash</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:24px;padding:40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

              <!-- Emoji -->
              <p style="margin:0 0 16px;font-size:40px;line-height:1;">🎧</p>

              <!-- Heading -->
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#1A1A1A;line-height:1.2;">
                You're on the list.
              </h1>

              <!-- Body -->
              <p style="margin:0 0 24px;font-size:16px;color:#737373;line-height:1.6;">
                Thanks for signing up for AudioFlash. We're putting the finishing touches on the app and we'll let you know the moment it's ready to download.
              </p>

              <p style="margin:0 0 32px;font-size:16px;color:#737373;line-height:1.6;">
                While you wait — AudioFlash uses AI to generate personalized audio flashcard lessons from real-world topics. Pick a language, pick a topic, and practice real conversations in just 5 minutes a day.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:0 0 32px;" />

              <!-- What to expect -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1A1A1A;text-transform:uppercase;letter-spacing:0.05em;">
                What to expect
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:18px;vertical-align:top;padding-right:12px;">✨</td>
                        <td style="font-size:15px;color:#737373;line-height:1.5;">Early access before public launch</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:18px;vertical-align:top;padding-right:12px;">🔊</td>
                        <td style="font-size:15px;color:#737373;line-height:1.5;">Launch updates and language learning tips</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:18px;vertical-align:top;padding-right:12px;">🎁</td>
                        <td style="font-size:15px;color:#737373;line-height:1.5;">Exclusive offer for waitlist members at launch</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#737373;line-height:1.6;">
                You're receiving this because you signed up at audioflash.ai.<br />
                <a href="${unsubscribeLink}" style="color:#737373;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
