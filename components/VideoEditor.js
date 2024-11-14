"use client";

import React, { useState, useRef, useEffect } from "react";
import VideoControls from "./VideoControls";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export default function VideoEditor() {
  const [clips, setClips] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const previewRef = useRef(null);
  const [ffmpeg, setFFmpeg] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const initFFmpeg = async () => {
      const ffmpegInstance = createFFmpeg({ log: true });
      await ffmpegInstance.load();
      setFFmpeg(ffmpegInstance);
    };
    initFFmpeg();
  }, []);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const newClips = await Promise.all(
      files.map(async (file) => ({
        id: Math.random().toString(36),
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        duration: await getVideoDuration(file),
        startTime: 0,
        endTime: await getVideoDuration(file),
      }))
    );
    setClips([...clips, ...newClips]);
  };

  const handleExport = async () => {
    if (!ffmpeg || !clips.length) return;
    setIsExporting(true);

    try {
      // Trim and concatenate clips logic here
      const outputUrl = await processClips(clips, ffmpeg);
      const link = document.createElement("a");
      link.href = outputUrl;
      link.download = "edited-video.mp4";
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <div className="bg-black aspect-video rounded-lg overflow-hidden">
            <video
              ref={previewRef}
              className="w-full h-full"
              src={clips[0]?.url}
              onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
            />
          </div>
          <VideoControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={(time) => {
              previewRef.current.currentTime = time;
              setCurrentTime(time);
            }}
          />
        </div>
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="video-input"
        />
        <div className="flex gap-4">
          <label
            htmlFor="video-input"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
          >
            Add Videos
          </label>
          <button
            onClick={handleExport}
            disabled={isExporting || !clips.length}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-500"
          >
            {isExporting ? "Exporting..." : "Export Video"}
          </button>
        </div>
      </div>
    </div>
  );
}
