import stampImg from "../../assets/stamp.png";

export default function CompanyStamp({ size = 220, opacity = 0.9, className = "" }) {
  return (
    <img
      src={stampImg}
      alt="MKS Alliance LLP Stamp"
      width={size}
      height={size}
      className={className}
      style={{ opacity, objectFit: "contain" }}
    />
  );
}
