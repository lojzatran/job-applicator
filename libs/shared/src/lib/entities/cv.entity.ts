import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';

@Entity('cv')
export class Cv {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column()
  path!: string;

  @Column()
  rawText!: string;

  @Column({ unique: true })
  hash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => JobApplication, (jobApplication) => jobApplication.cv)
  jobApplications!: Promise<JobApplication[]>;
}
