import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('job')
export class Job {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ unique: true })
  url!: string;

  @Column()
  title!: string;

  @Column()
  company!: string;

  @Column()
  description!: string;

  @Column()
  source!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
