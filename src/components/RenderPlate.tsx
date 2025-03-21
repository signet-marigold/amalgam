interface RenderPlateProps {
}

const RenderPlate: React.FC<RenderPlateProps> = ({ }) => {
  return (
    <section className="preview-container">
      <div className="preview-wrapper">
        <canvas id="preview-canvas"></canvas>
        <div className="preview-controls">
          <button id="play-pause-btn" className="btn icon">▶</button>
          <div id="time-display" className="time-display">00:00:00 / 00:00:00</div>
        </div>
      </div>
    </section>
  );
}

export default RenderPlate;
