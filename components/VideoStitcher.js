"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const VideoStitcher = () => {
  const [videoUrls, setVideoUrls] = useState([""]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [ffmpeg, setFFmpeg] = useState(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [activePreview, setActivePreview] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const timelineRef = useRef(null);
  const { toast } = useToast();

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

  const showError = (message) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
    });
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
        showError("Failed to load FFmpeg. Please try again later.");
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

      downloadedVideos.forEach((file, index) => {
        ffmpeg.FS("writeFile", `video${index}.mp4`, file);
      });

      const fileList = downloadedVideos
        .map((_, index) => `file 'video${index}.mp4'`)
        .join("\n");
      ffmpeg.FS(
        "writeFile",
        "filelist.txt",
        new TextEncoder().encode(fileList)
      );

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

  const handleVideoSelect = (index) => {
    setSelectedIndex(index);
    setActivePreview(videoUrls[index]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Card className="border-b rounded-none">
        <CardContent className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <CardTitle className="text-2xl">Video Editor</CardTitle>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={addUrlField}>
              Add Video
            </Button>
            <Button
              onClick={handleStitchVideos}
              disabled={isLoading || !isFFmpegLoaded}
            >
              {isLoading ? "Processing..." : "Export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6">
        <Card className="col-span-8">
          <CardContent className="p-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
              {activePreview ? (
                <video
                  key={activePreview}
                  src={getProxiedUrl(activePreview)}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Select a video to preview
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedIndex !== null && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Video URL
                  </label>
                  <Input
                    value={videoUrls[selectedIndex]}
                    onChange={(e) => handleUrlChange(selectedIndex, e)}
                    placeholder="Enter video URL"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={timelineRef}
              className="flex gap-4 overflow-x-auto pb-4 min-h-[160px]"
            >
              {videoUrls.map((url, index) => (
                <div
                  key={index}
                  onClick={() => handleVideoSelect(index)}
                  className={`relative flex-shrink-0 w-[200px] rounded-lg border-2 transition-all ${
                    selectedIndex === index
                      ? "border-primary"
                      : "border-transparent hover:border-primary/50"
                  }`}
                >
                  {url && isValidVideoUrl(url) ? (
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <video
                        src={getProxiedUrl(url)}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUrlField(index);
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      Drop video here
                    </div>
                  )}
                  <div className="mt-2 text-sm text-muted-foreground truncate px-2">
                    Video {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!downloadLink} onOpenChange={() => setDownloadLink(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Complete</DialogTitle>
          </DialogHeader>
          <video
            src={downloadLink}
            controls
            className="w-full rounded-lg mb-4"
          />
          <div className="flex justify-end">
            <Button asChild>
              <a href={downloadLink} download="edited-video.mp4">
                Download Video
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isFFmpegLoaded && !error && (
        <div className="fixed inset-0 bg-background/90 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Progress value={30} className="w-[60%] mx-auto" />
            <p className="text-xl">Loading Editor...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoStitcher;
