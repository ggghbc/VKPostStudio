# Feature Catalog & Functional Guide

A complete reference guide to all capabilities, tools, workflows, and configuration options available in **VK Post Studio**.

---

## 1. Post Creation & Rich Media Editor

### 1.1 Text Composition
- **Live Character Counter:** Displays character length up to VK's limit of **15,895 characters**.
- **Auto-Saving Draft:** State is automatically persisted to local storage (`vk_draft`). If you accidentally close the application, your unposted text, attachments, and toggle settings are restored on next launch.
- **Editing Mode:** Any queued post can be loaded back into the editor (`onLoadToEditor`) to adjust text, reorder attachments, change publication parameters, and save updates back into the SQLite database.

### 1.2 File Attachment System
- **Drag-and-Drop Dropzone:** Drag up to 10 image files simultaneously directly onto the editor zone or use the file picker dialog (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`).
- **Direct Clipboard Pasting (Ctrl+V):** Paste images copied from browsers, screenshot utilities (Snipping Tool, ShareX), or graphic editors directly into the application window. Images are automatically saved to `%APPDATA%/pasted_images/`.
- **Media Reordering:** Use interactive left/right controls on each attachment thumbnail to reorder images before uploading. The specified sequence is strictly preserved when creating VK wall posts.
- **Full-Screen Lightbox:** Click any attachment thumbnail to open a high-resolution modal preview.

---

## 2. Publication Settings & VK Flags

Each post supports fine-grained control over VKontakte post attributes:

| Option | VK API Parameter | Description |
|---|---|---|
| **Media Layout Style** | `primary_attachments_mode` | Choose between **Grid** (`grid`) or modern **Carousel** (`carousel`) view in the VK mobile/desktop feed. |
| **Comments on Post** | `close_comments` | Enable or disable follower comments under the specific publication (`0` = open, `1` = closed). |
| **Subscriber Notifications** | `mute_notifications` | Toggle the notification bell for community followers (`0` = send bell notification, `1` = silent). |
| **Author Signature** | `signed` | Appends *"Author: Firstname Lastname"* to community posts (`1` = signed, `0` = unsigned). |
| **Mark as Ad** | `mark_as_ads` | Marks the publication with the official *"Ad by creator"* tag (`1` = ad, `0` = standard). |

---

## 3. Smart Pattern Engine (Posting Schedule)

The **Pattern Engine** eliminates manual scheduling calculations by computing the next ideal publication time based on mathematical rules.

### Configuration Parameters:
1. **Times List:** Comma-separated times (e.g. `14:00, 18:00, 21:00`).
2. **Interval in Days:**
   - `1`: Posts scheduled daily at specified hours.
   - `2`: Posts scheduled every other day.
   - `N`: Posts scheduled every N days.
3. **Timezone:** Full IANA timezone support (default: `Europe/Moscow`).
4. **Minimum Spacing:** Default minimum interval of 30 minutes between consecutive posts.

### Slot Allocation Algorithm:
- Finds the timestamp of the latest scheduled post on the selected target.
- Searches sequentially forward starting from `now + 2 minutes`.
- Picks the earliest matching time slot that satisfies the weekday, time list, and interval day spacing.
- Automatically handles daylight savings transitions and ambiguous hours.

---

## 4. Batch Queue Generator (Bulk Scheduling)

Quickly generate dozens of scheduled posts from a folder of images:

1. Click the **Batch Mode** button (`Layers3` icon) in the header.
2. Drag and drop dozens or hundreds of image files into the batch dropzone.
3. Select a **Split Scheme**:
   - **1 image per post**: Ideal for photo galleries, wallpapers, or single memes.
   - **2 images per post**: Ideal for comparisons, before/after, or diptychs.
   - **4 images per post**: Balanced square grid layouts.
4. Provide an optional shared caption or hashtag block for all generated posts.
5. Click **Generate Queue**: Posts are created in SQLite with sequentially spaced timestamps matching the active pattern.

---

## 5. Multi-Tab Queue Panel

The right-side collapsible panel provides full visibility over your content pipeline:

### 5.1 Local Queue Tab
- Displays posts prepared on your computer waiting to be sent to VK.
- **Transfer to VK Button:** Initiates the asynchronous background worker (`TransferWorker`) that uploads photos and schedules posts on VK servers.
- **Per-Post Controls:**
  - *Load to Editor*: Edit text, toggles, or attachments.
  - *Next Slot*: Reschedules the post to the tail of the current pattern.
  - *Set Time*: Opens the calendar/time picker for manual rescheduling.
  - *Delete*: Safely deletes the post and associated attachments.

### 5.2 VK Scheduled Tab
- Displays delayed posts that currently reside in VKontakte's cloud queue (`wall.get?filter=postponed`).
- **Synchronize Button:** Refreshes the list from VK API.
- **Download Media:** Fetch and preview cloud photos directly in the app.
- **Revert to Local:**
  - *Revert at same time*: Removes post from VK cloud and puts it back into your local queue at the exact same timestamp.
  - *Revert to next slot*: Removes post from VK cloud and puts it into your local queue at the next available schedule slot.

### 5.3 History Tab
- Displays posts that have been published to the wall, archived, or removed on VKontakte.
- Allows downloading attachments, re-queueing content, or reviewing performance.

### 5.4 Live Community Wall Viewer
- Click the **Database** icon in the header to launch the interactive **Wall Viewer**.
- Directly scans published posts from the selected community or user profile.
- Supports pagination (*Load More* fetches next 30 posts), chronological sorting, text expansion, and full-resolution photo inspection.

---

## 6. Visual Content Calendar

Switch from list view to the **Calendar View** to see a visual monthly planner:
- Displays all scheduled publications mapped across days of the month.
- Color-coded badges for status:
  - `лок`: Local queue
  - `отл`: Scheduled in VK cloud
  - `вк`: Published on wall
  - `ош`: Failed / Error
- Click any calendar post to open a comprehensive detail modal with full text, publication time, and attached photo gallery.

---

## 7. Authenticated VK Smart Grid Live Mockup

Click the **Eye** icon in the post creator to open the **VK Live Feed Mockup**:
- Realistic simulation of how your publication will appear in the VKontakte newsfeed.
- Dynamically renders your community avatar, title, and scheduling metadata.
- Emulates VK's proprietary photo collage layouts:
  - **1 photo**: Full-width high-resolution card.
  - **2 photos**: Side-by-side balanced dual columns.
  - **3 photos**: 1 large feature photo on the left, 2 stacked thumbnails on the right.
  - **4 photos**: 2x2 symmetrical quad grid.
  - **6 photos**: 2 large header photos, 4 bottom strip thumbnails.
  - **7 photos**: 2 large header photos, 5 bottom strip thumbnails.
  - **9 photos**: 3x3 uniform gallery grid.
  - **Carousel**: Horizontally scrollable swipe cards.

---

## 8. Safe Disk Space Cleaner

When working with hundreds of high-resolution images, local disk storage fills quickly.
- Click the **Hard Drive** icon on the queue panel.
- Scans for local files whose parent posts have **already been successfully uploaded to VK**.
- Safely moves original source images to the **Operating System Recycle Bin** (or permanently deletes them based on Settings).
- Lightweight cached thumbnails (`.thumb`) in VK Post Studio are preserved, keeping your queue readable and responsive.
