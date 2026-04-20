import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cv')
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
