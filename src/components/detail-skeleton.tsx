export function DetailSkeleton() {
  return (
    <section
      className="nft-page detail-placeholder"
      role="status"
      aria-label="Carregando NFT"
    >
      <div className="skeleton placeholder-breadcrumb" />
      <div className="detail-placeholder-layout">
        <div className="skeleton detail-placeholder-gallery" />
        <div className="detail-placeholder-copy">
          <div className="skeleton placeholder-title" />
          <div className="skeleton placeholder-price" />
          <div className="skeleton placeholder-text" />
          <div className="skeleton placeholder-control" />
          <div className="skeleton placeholder-control" />
        </div>
      </div>
      <div className="skeleton placeholder-description" />
    </section>
  );
}
