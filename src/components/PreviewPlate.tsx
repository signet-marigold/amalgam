interface PreviewPlateProps {
}

const PreviewPlate: React.FC<PreviewPlateProps> = ({ }) => {
  return (
    <section>
      <div className="flex justify-center items-center p-4">
        <canvas id="preview-canvas" className="shadow border border-bordercolor rounded "></canvas>
        <div className="">
          <button id="play-pause-btn" className="">▶</button>
          <div id="time-display" className="">00:00:00 / 00:00:00</div>
        </div>
      </div>
    </section>
  );
}

export default PreviewPlate;
