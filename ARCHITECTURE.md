# Constraints
Input:
  - formats mp4,mov,avi,mkv,webm
  - frame rates 24p,25p,29.97p,30p,48p,50p,59.94p,60p
  - resolutions between 16x16 and 8192x8192
  - filesize between 1kb to 2gb
Output:
  - formats mp4,mkv,webm
  - frame rates 24p,25p,29.97p,30p,48p,50p,59.94p,60p
  - resolutions between 16x16 and 8192x8192
  - filesize between 1kb to 2gb
  
# Notes

The timeline tracks will not support having space or gaps between clips.
Currently targeting only one track.

# Flow

A clip is added from a source on the desktop. This clip is loaded into the ClipManager and it's details are stored. As a part of this load, ClipManager will figure out where the clip will be in the timeline and set that position in it's settings. Then a callback will be run to regenerate. This will force UnifiedBuffer to generate a new video based on the state of ClipManager. And will force TimelineState to rebuild the visual display of these clips based on the state of ClipManager.

If all clips in ClipManager have the same resolution, update UnifiedBuffer setting.
If all clips in ClipManager have the same frame rate, update UnifiedBuffer setting.

If a clip is moved on the timeline, call regenerate.
If a clip is removed from the timeline, call regenerate.
If a clip is spliced in two, call regenerate.

