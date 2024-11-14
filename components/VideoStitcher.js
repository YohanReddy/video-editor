"use client";

import React, { useState, useEffect } from "react";

const VideoStitcher = () => {
  const [videoUrls, setVideoUrls] = useState([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [ffmpeg, setFFmpeg] = useState(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Add this utility function at the top of the component
  const isValidVideoUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getProxiedUrl = (url) => {
    if (!url) return "";
    return `/api/proxy-video?url=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");
        const ffmpegInstance = createFFmpeg({
          log: true,
          corePath: "/ffmpeg-core.js",
        });

        window.createFFmpeg = createFFmpeg;
        window.fetchFile = fetchFile;

        await ffmpegInstance.load();
        setFFmpeg(ffmpegInstance);
        setIsFFmpegLoaded(true);
      } catch (err) {
        console.error("Error loading FFmpeg:", err);
        setError("Failed to load FFmpeg. Please try again later.");
        setIsFFmpegLoaded(false);
      }
    };
    loadFFmpeg();
  }, []);

  const handleUrlChange = (index, event) => {
    const updatedUrls = [...videoUrls];
    updatedUrls[index] = event.target.value;
    setVideoUrls(updatedUrls);
  };

  const addUrlField = () => setVideoUrls([...videoUrls, ""]);
  const removeUrlField = (index) =>
    setVideoUrls(videoUrls.filter((_, idx) => idx !== index));

  const handleStitchVideos = async () => {
    if (!ffmpeg || !isFFmpegLoaded) {
      setError("FFmpeg not loaded");
      return;
    }

    setIsLoading(true);
    try {
      const { fetchFile } = window;

      // Download each video through the proxy API
      const downloadedVideos = await Promise.all(
        videoUrls.map(async (url, index) => {
          const response = await fetch(getProxiedUrl(url));
          const blob = await response.blob();
          const file = new File([blob], `video${index}.mp4`, {
            type: "video/mp4",
          });
          return fetchFile(file);
        })
      );

      // Save videos to the ffmpeg virtual file system
      downloadedVideos.forEach((file, index) => {
        ffmpeg.FS("writeFile", `video${index}.mp4`, file);
      });

      // Generate a list file to concatenate the videos using FFmpeg
      const fileList = downloadedVideos
        .map((_, index) => `file 'video${index}.mp4'`)
        .join("\n");
      ffmpeg.FS(
        "writeFile",
        "filelist.txt",
        new TextEncoder().encode(fileList)
      );

      // Run ffmpeg to concatenate videos
      await ffmpeg.run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "filelist.txt",
        "-c",
        "copy",
        "output.mp4"
      );

      // Read the result and create a downloadable link
      const data = ffmpeg.FS("readFile", "output.mp4");
      const videoBlob = new Blob([data.buffer], { type: "video/mp4" });
      const videoUrl = URL.createObjectURL(videoBlob);

      setDownloadLink(videoUrl);
    } catch (error) {
      console.error("Error processing videos:", error);
      setError("Failed to process videos. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Video Stitcher
        </h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!isFFmpegLoaded && !error && (
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
            <div className="animate-spin mr-2 h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="text-blue-600">Loading FFmpeg...</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {videoUrls.map((url, index) => (
            <div key={index} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  placeholder={`Video URL ${index + 1}`}
                  onChange={(event) => handleUrlChange(index, event)}
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={() => removeUrlField(index)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
              {url && isValidVideoUrl(url) && (
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    key={url} // Add key to force re-render when URL changes
                    src={getProxiedUrl(url)}
                    controls
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Don't hide the video element, just show error overlay
                      const errorOverlay = document.createElement("div");
                      errorOverlay.className =
                        "absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-75";
                      errorOverlay.innerHTML =
                        "Unable to preview video. The URL might be restricted or invalid.";
                      e.target.parentElement.appendChild(errorOverlay);
                    }}
                  />
                </div>
              )}
              {url && !isValidVideoUrl(url) && (
                <div className="p-2 text-red-500 bg-red-50 rounded">
                  Please enter a valid video URL
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={addUrlField}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Add Another URL
          </button>
          <button
            onClick={handleStitchVideos}
            disabled={isLoading || !isFFmpegLoaded}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              isLoading || !isFFmpegLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></span>
                Processing...
              </span>
            ) : (
              "Stitch Videos"
            )}
          </button>
        </div>

        {downloadLink && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Download Combined Video:
            </h3>
            <div className="space-y-4">
              <video
                src={downloadLink}
                controls
                className="w-full rounded-lg"
              />
              <a
                href={downloadLink}
                download="stitched-video.mp4"
                className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Download Video
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoStitcher;
