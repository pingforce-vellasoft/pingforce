export interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

export interface Plan {
  readonly name: string;
  readonly tagline: string;
  readonly price: string;
  readonly period: string;
  readonly highlighted: boolean;
  readonly cta: string;
  readonly features: readonly string[];
}
