export type Effect = {
  type: "modifyAttack" | "grantRelic";
  value?: number;
};
