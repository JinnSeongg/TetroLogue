type Props = {
  floor: number;
};

export function FloorLabel({ floor }: Props) {
  return <div className="floor-label">FLOOR {floor}</div>;
}
