import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('job_application')
export class JobApplication {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'jsonb' })
  job!: object;

  @Column({ unique: true })
  url!: string;

  @Column({ nullable: true })
  coverLetter?: string;

  @Column()
  source!: string;

  @Column()
  createdAt!: Date;
}
