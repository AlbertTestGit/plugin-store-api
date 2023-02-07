export class PluginRestDto {
  id: number;
  name: string;
  date_created: Date;
  attributes: { name: string; options: string[] }[];
}
