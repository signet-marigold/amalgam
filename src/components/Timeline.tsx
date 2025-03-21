interface TimelineProps {
}

const Timeline: React.FC<TimelineProps> = ({ }) => {
  return (
    <section>
      <div className="bg-timelinecolor border-b-1 border-t-1 border-bordercolor py-2 pl-1">
        <button id="zoom-in-btn" className="p-0 w-8 h-7 mx-1">+</button>
        <button id="zoom-out-btn" className="p-0 w-8 h-7 mx-1">-</button>
        <button id="split-btn" className="p-0 px-3 h-7 mx-1">Split</button>
      </div>
      <div id="timeline" className="">
        <div className="bg-background border-b-1 border-bordercolor h-6 text-xs flex items-center" id="timeline-ruler">00:00:000</div>
        <div className="" id="timeline-tracks">
          <div className="bg-trackcolor flex border-b-2 border-timelinecolor" id="video-track-1">
            <div className="bg-background text-sm p-3 border-r-1 border-bordercolor text-secondary h-20 w-[140px]" id="video-track-1-title">Video 1</div>
            <div className="bg-trackcolor w-[calc(100%-140px)]" id="video-track-1-timeline"></div>
          </div>
          <div className="bg-trackcolor flex border-b-2 border-timelinecolor" id="audio-track-1">
            <div className="bg-background text-sm p-3 border-r-1 border-bordercolor text-primary h-20 w-[140px]" id="audio-track-1-title">Audio 1</div>
            <div className="bg-trackcolor w-[calc(100%-140px)]" id="audio-track-1-timeline"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Timeline;
