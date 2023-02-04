import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class License {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  swid: string;

  @Column()
  userId: number;

  @Column()
  expireDate: Date;

  @Column({ nullable: true })
  hwid?: string;
}
