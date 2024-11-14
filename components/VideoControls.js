export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-4 flex items-center gap-4">
      <button
        onClick={onPlayPause}
        className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600"
      >
        {isPlaying ? (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-white">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-white">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
