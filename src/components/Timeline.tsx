interface TimelineProps {
}

const Timeline: React.FC<TimelineProps> = ({ }) => {
  return (
    <section className="timeline-container">
      <div className="timeline-controls">
        <button id="zoom-in-btn" className="btn small button-small">+</button>
        <button id="zoom-out-btn" className="btn small">-</button>
        <button id="split-btn" className="btn small">Split</button>
      </div>
      <div id="timeline" className="timeline">
        <div className="timeline-ruler" id="timeline-ruler"></div>
        <div className="timeline-tracks" id="timeline-tracks">
          <div className="track video-track" id="video-track-1">
          </div>
          <div className="track audio-track" id="audio-track-1">
          </div>
        </div>
      </div>
    </section>
  );
}

export default Timeline;
