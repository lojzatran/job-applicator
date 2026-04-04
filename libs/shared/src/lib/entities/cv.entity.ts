import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Cv {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  path!: string;

  @Column()
  rawText!: string;

  @Column({ unique: true })
  hash!: string;

  @Column()
  createdAt!: Date;
}
