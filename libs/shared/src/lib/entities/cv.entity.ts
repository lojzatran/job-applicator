import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Cv {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column()
  path!: string;

  @Column()
  rawText!: string;

  @Column({ unique: true })
  hash!: string;

  @Column()
  createdAt!: Date;
}
