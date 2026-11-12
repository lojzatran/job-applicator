import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DatabaseEntity } from './databaseEntity.interface';

@Entity('job_application_processing_run')
export class JobApplicationProcessingRun implements DatabaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column()
  status!: 'pending' | 'in progress' | 'completed' | 'failed';

  @Column()
  totalJobs!: number;

  @Column()
  evaluatedJobApplications!: number;

  @Column()
  dismissedJobApplications!: number;

  @Column()
  appliedJobApplications!: number;

  @Column({ unique: true })
  threadId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
