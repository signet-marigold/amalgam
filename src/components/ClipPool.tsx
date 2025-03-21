interface ClipPoolProps {
}

const ClipPool: React.FC<ClipPoolProps> = ({ }) => {
  return (
    <section className="clip-pool-container">
      <h3>Media Library</h3>
      <div id="clip-pool" className="clip-pool">
      </div>
      <div className="clip-pool-controls">
        <button id="add-to-timeline-btn" className="btn small" disabled>Add to Timeline</button>
        <button id="delete-clip-btn" className="btn small danger" disabled>Delete</button>
      </div>
    </section>
  );
}

export default ClipPool;
