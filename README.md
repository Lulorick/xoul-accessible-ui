# Xoul.AI Accessible UI

A Tampermonkey userscript for [Xoul.ai](https://xoul.ai) that makes chats easier to read and use: larger chat text, bigger avatars, a bigger group-chat character picker, and higher-contrast message controls. Everything is adjustable from one floating **Settings** button that you can drag anywhere on screen.

## Installation

1. Use a compatible browser: **Firefox** or **Edge** for tablet.
2. Install the **Tampermonkey** extension for your browser. https://www.tampermonkey.net/
3. Open `xoul-ui-settings.user.js` in this repository and click **Raw**. Tampermonkey will offer to install it. If it doesn't, save the file and drag it into the Tampermonkey dashboard.
4. Reload Xoul.ai. The **Settings** button will appear on screen in the bottom right-hand corner of the screen.

## Settings

Click the **Settings** button to open the panel. Your choices are saved in your browser and remembered next time.

| Setting | What it does |
| --- | --- |
| **Chat Text Size** | Slider from **16px to 40px**. Only changes the text inside chat bubbles. Use **Use site default size** to turn it off. |
| **Also enlarge the typing box** | Makes the Chat Text Size setting apply to the text you type in the message input field too. |
| **Avatar Size** | **Small**, **Medium** or **Large** character avatars next to messages. |
| **Avatar Shape** | Choose the aspect ratio: **Square** (1:1, the image is centred) or **Portrait** (2:3 rectangle). |
| **Large Character Picker** | For **group chats only**. Makes the buttons that control who responds next larger, with larger images. |
| **Enhanced Info Bar** | Adds a background and more contrast to the bar under each message (timestamp, narration, regenerate and the **...** menu). Useful for chats with a background image that make it hard to see. |

## Moving the Settings button

Drag the handle (⠿) on the left side of the button to put it anywhere. Its position is remembered. Double-click the handle, or use **Reset button position** in the panel, to put it back in the bottom-right corner.

## Updating

If you installed from this repository, Tampermonkey can check for updates automatically. Otherwise, repeat the install steps with the new version.

## Notes

This is an unofficial userscript and is not affiliated with Xoul.ai. If the site changes its layout, parts of the script may stop working until it's updated.
