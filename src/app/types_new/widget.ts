export interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
}

export interface WidgetTemplate {
  type: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  defaultSize: { width: number; height: number };
  preview: string;
}
